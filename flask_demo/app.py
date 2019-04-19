import os
import sys
from os import environ
from flask import Flask
from flask import flash
from flask import jsonify
from flask import make_response
from flask import redirect
from flask import render_template
from flask import request
from flask import session
from flask import url_for
from flask import Markup
from flask import send_from_directory
from flask_login import LoginManager
from flask_login import login_required
from flask_login import login_user
from flask_login import logout_user
from flask_login import current_user
import util

from db import db
from context import webauthn
from models import User

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///{}'.format(
    os.path.join(os.path.dirname(os.path.abspath(__name__)), 'webauthn.db'))
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
sk = environ.get('FLASK_SECRET_KEY')
app.secret_key = sk if sk else os.urandom(40)
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)


RP_ID = 'dev.jrmann.com'
ORIGIN = 'https://dev.jrmann.com'

# Trust anchors (trusted attestation roots) should be
# placed in TRUST_ANCHOR_DIR.
TRUST_ANCHOR_DIR = 'trusted_attestation_roots'

@app.route('/favicon.ico')
def favicon():
   return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.ico',mimetype='image/vnd.microsoft.icon')

@app.after_request
def apply_caching(response):
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self' *.googleapis.com *.gstatic.com"
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

@login_manager.unauthorized_handler
def handle_needs_login():
    flash("Please log in to continue.")
    return redirect(url_for('login', next=request.endpoint))

def redirect_dest(fallback):
    dest = request.args.get('next')
    try:
        dest_url = url_for(dest)
    except:
        return redirect(fallback)
    return redirect(dest_url)

whitelisted_users = [1, 2]

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.args.get('nginx') and current_user.is_authenticated and current_user.id not in whitelisted_users:
        flash("You aren't whitelisted for service access.")
        flash("Please contact a network administrator.")
    elif request.args.get('nginx') and not current_user.is_authenticated:
        flash("Please log in in order to access this service.")
    if current_user.is_authenticated:
        #flash("Logged in!")
        return redirect_dest(fallback=url_for('index'))
    else:
        return render_template("login.html")

@app.route("/")
@login_required
def index():
    return render_template("index.html")

@app.route("/auth")
def nginx_auth():
    if current_user.is_authenticated and current_user.id in whitelisted_users:
        return "User is logged in and has access to services."
    elif current_user.is_authenticated and current_user.id not in whitelisted_users:
        return "User is logged in but does not have access to services", 401
    else:
        return "User is not logged in.", 401

@login_manager.user_loader
def load_user(user_id):
    try:
        int(user_id)
    except ValueError:
        return None

    return User.query.get(int(user_id))


@app.route('/webauthn_begin_activate', methods=['POST'])
def webauthn_begin_activate():
    # MakeCredentialOptions
    username = request.form.get('register_username')
    display_name = request.form.get('register_display_name')

    if not util.validate_username(username):
        return make_response(jsonify({'fail': 'Invalid username.'}), 401)
    if not util.validate_display_name(display_name):
        return make_response(jsonify({'fail': 'Invalid display name.'}), 401)

    if User.query.filter_by(username=username).first():
        return make_response(jsonify({'fail': 'User already exists.'}), 401)

    if 'register_ukey' in session:
        del session['register_ukey']
    if 'register_username' in session:
        del session['register_username']
    if 'register_display_name' in session:
        del session['register_display_name']
    if 'challenge' in session:
        del session['challenge']

    session['register_username'] = username
    session['register_display_name'] = display_name

    rp_name = 'dev.jrmann.com'
    challenge = util.generate_challenge(32)
    ukey = util.generate_ukey()

    session['challenge'] = challenge
    session['register_ukey'] = ukey

    make_credential_options = webauthn.WebAuthnMakeCredentialOptions(
        challenge, rp_name, RP_ID, ukey, username, display_name,
        'https://dev.jrmann.com/favicon.ico')

    return jsonify(make_credential_options.registration_dict)


@app.route('/webauthn_begin_assertion', methods=['POST'])
def webauthn_begin_assertion():
    username = request.form.get('login_username')

    if not util.validate_username(username):
        return make_response(jsonify({'fail': 'Invalid username.'}), 401)

    user = User.query.filter_by(username=username).first()

    if not user:
        return make_response(jsonify({'fail': 'User does not exist.'}), 401)
    if not user.credential_id:
        return make_response(jsonify({'fail': 'Unknown credential ID.'}), 401)

    if 'challenge' in session:
        del session['challenge']

    challenge = util.generate_challenge(32)

    session['challenge'] = challenge

    webauthn_user = webauthn.WebAuthnUser(
        user.ukey, user.username, user.display_name, user.icon_url,
        user.credential_id, user.pub_key, user.sign_count, user.rp_id)

    webauthn_assertion_options = webauthn.WebAuthnAssertionOptions(
        webauthn_user, challenge)

    return jsonify(webauthn_assertion_options.assertion_dict)


@app.route('/verify_credential_info', methods=['POST'])
def verify_credential_info():
    challenge = session['challenge']
    username = session['register_username']
    display_name = session['register_display_name']
    ukey = session['register_ukey']

    registration_response = request.form
    trust_anchor_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), TRUST_ANCHOR_DIR)
    trusted_attestation_cert_required = True
    self_attestation_permitted = True
    none_attestation_permitted = True

    webauthn_registration_response = webauthn.WebAuthnRegistrationResponse(
        RP_ID,
        ORIGIN,
        registration_response,
        challenge,
        trust_anchor_dir,
        trusted_attestation_cert_required,
        self_attestation_permitted,
        none_attestation_permitted,
        uv_required=False)  # User Verification

    try:
        webauthn_credential = webauthn_registration_response.verify()
    except Exception as e:
        return jsonify({'fail': 'Registration failed. Error: {}'.format(e)})

    # Step 17.
    #
    # Check that the credentialId is not yet registered to any other user.
    # If registration is requested for a credential that is already registered
    # to a different user, the Relying Party SHOULD fail this registration
    # ceremony, or it MAY decide to accept the registration, e.g. while deleting
    # the older registration.
    credential_id_exists = User.query.filter_by(
        credential_id=webauthn_credential.credential_id).first()
    if credential_id_exists:
        return make_response(
            jsonify({
                'fail': 'Credential ID already exists.'
            }), 401)

    existing_user = User.query.filter_by(username=username).first()
    if not existing_user:
        if sys.version_info >= (3, 0):
            webauthn_credential.credential_id = str(
                webauthn_credential.credential_id, "utf-8")
        user = User(
            ukey=ukey,
            username=username,
            display_name=display_name,
            pub_key=webauthn_credential.public_key,
            credential_id=webauthn_credential.credential_id,
            sign_count=webauthn_credential.sign_count,
            rp_id=RP_ID,
            icon_url='https://dev.jrmann.com/favicon.ico')
        db.session.add(user)
        db.session.commit()
    else:
        return make_response(jsonify({'fail': 'User already exists.'}), 401)

    flash(Markup('Welcome, <strong>{}</strong>. Please log in.'.format(username)))

    return jsonify({'success': 'User successfully registered.'})


@app.route('/verify_assertion', methods=['POST'])
def verify_assertion():
    challenge = session.get('challenge')
    assertion_response = request.form
    credential_id = assertion_response.get('id')

    user = User.query.filter_by(credential_id=credential_id).first()
    if not user:
        return make_response(jsonify({'fail': 'User does not exist.'}), 401)

    webauthn_user = webauthn.WebAuthnUser(
        user.ukey, user.username, user.display_name, user.icon_url,
        user.credential_id, user.pub_key, user.sign_count, user.rp_id)

    webauthn_assertion_response = webauthn.WebAuthnAssertionResponse(
        webauthn_user,
        assertion_response,
        challenge,
        ORIGIN,
        uv_required=False)  # User Verification

    try:
        sign_count = webauthn_assertion_response.verify()
    except Exception as e:
        return jsonify({'fail': 'Assertion failed. Error: {}'.format(e)})

    # Update counter.
    user.sign_count = sign_count
    db.session.add(user)
    db.session.commit()

    login_user(user)

    return jsonify({
        'success':
        'Successfully authenticated as {}'.format(user.username)
    })


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='localhost', port=8081, ssl_context='adhoc', debug=True)

