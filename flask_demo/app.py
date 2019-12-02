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

from requests import get

from werkzeug.contrib.fixers import ProxyFix

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///{}'.format(
    os.path.join(os.path.dirname(os.path.abspath(__name__)), 'webauthn.db'))
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
sk = environ.get('FLASK_SECRET_KEY')
app.secret_key = sk if sk else os.urandom(40)
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
app.url_map.strict_slashes = False

RP_ID = 'dev.jrmann.com'
ORIGIN = 'https://dev.jrmann.com'

# Trust anchors (trusted attestation roots) should be
# placed in TRUST_ANCHOR_DIR.
TRUST_ANCHOR_DIR = 'trusted_attestation_roots'


#@app.errorhandler(404) // need to implement jrmann.com 404 without inline loading.
#def page_not_found(e):
#    return render_template('404.html'), 404

@app.route('/favicon.ico')
def favicon():
   return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.ico',mimetype='image/vnd.microsoft.icon')

@app.route('/static/<path:path>')
def send_js(path):
        return send_from_directory(os.path.join(app.root_path, 'static'), path)

@app.after_request
def apply_caching(response):
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self' *.googleapis.com *.gstatic.com"
    response.headers['Access-Control-Allow-Origin'] = "rhsweb.org"
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
        return "<!DOCTYPE HTML><html><body style=\"background-color: #191919; color: #c7c7c7; font-family: sans-serif;\"><p>You aren't whitelisted for service access.\nPlease contact a network administrator.</p></body>", 403 # CUSTOM ERR CODE/PAGE?
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
    return render_template("index.html", whitelisted = current_user.id in whitelisted_users) # Keep in mind boolean must be changed for JS

@app.route("/account")
@login_required
def account():
    return render_template("account.html", user = User.query.filter_by(id=current_user.id).first_or_404())

@app.route("/radio")
@login_required
def radio():
    return render_template("radio.html")

@app.route("/grades")
#@login_required
def grades():
    return render_template("grades.html")

@app.route("/accent")
def accent():
    return render_template("accent.html")

# those above need to be redone so they are automatically loaded, I think. not sure.

@app.route("/fetchGrades", methods=['GET', 'POST'])
#@login_required
def gradesRequest():
    json = request.get_json(silent=True)
    try:
        if (not json or not (json['name'] and json['password'] and json['user-agent'])):
            return "Malformed request.", 500 
    except KeyError:
        return "Malformed request.", 500
    alphanum = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    name = ''.join(c.lower() for c in json['name']if not c.isspace())
    password = ''.join(c.lower() for c in json['password'] if not c.isspace())
    code = "r"
    for i in range(0, min(24, max(len(name), len(password)))):
        n = p = 0
        if (i < len(name)):
            n = alphanum.index(name[i])
        if (i < len(password)):
            p = alphanum.index(password[i])
        #n = (0 if n < 0 else n)
        #p = (0 if p < 0 else p)
        n = max(0, n)
        p = max(0, p)
        value = ((2 * n + p) ^ 13) % (len(alphanum) - 1)
        if (value > 0):
            code += alphanum[value]
    headers = {
        'User-Agent': json['user-agent'],
        'Content-Type': 'text/html',
    }
    r = get("http://rhsweb.org/slovelady/GRADES/Current/AllClasses/" + code + ".html", headers=headers)
    return (r.text, r.status_code, r.headers.items()) 

if "--backdoor" in sys.argv[1:]:
    print("BACKDOOR ENABLED - SECURITY VULNERABLE")

@app.route("/backdoor")
def backdoor():
    if "--backdoor" in sys.argv[1:]:
        if request.args.get('password') and request.args.get('password') == 'ins3cur1ty!' and request.args.get('user') and int(request.args.get('user')) in whitelisted_users:
            db.session.add(load_user(int(request.args.get('user'))))
            db.session.commit()
            login_user(load_user(int(request.args.get('user'))))
            flash("You used the backdoor to get in. Don't do it again.")
            return redirect(url_for("index"))
        else:
            return "Nice try, but it's going to take more l33t h4x0r skills to break into this website."
    else:
        return "Backdoor disabled. Run server with --backdoor to enable."

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

