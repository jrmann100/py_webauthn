function b64enc(buf) {
  return base64js.fromByteArray(buf)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function b64RawEnc(buf) {
  return base64js.fromByteArray(buf)
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function hexEncode(buf) {
  return Array.from(buf)
    .map(function(x) {
      return ("0" + x.toString(16)).substr(-2);
    })
    .join("");
}

async function fetch_json(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (body.fail)
    throw body.fail;
  return body;
}

/**
 * REGISTRATION FUNCTIONS
 */

/**
 * Callback after the registration form is submitted.
 * @param {Event} e 
 */
const didClickRegister = async (e) => {
  e.preventDefault();

  const form = document.querySelector('#unlock-form');
  let basicFormData = new FormData(form);
  basicFormData.set("register_username", basicFormData.get('username'));
  basicFormData.set("register_display_name", basicFormData.get("display_name"));
  basicFormData.delete("username");
  basicFormData.delete("display_name");
  const formData = basicFormData;

  // post the data to the server to generate the PublicKeyCredentialCreateOptions
  let credentialCreateOptionsFromServer;
  try {
    credentialCreateOptionsFromServer = await getCredentialCreateOptionsFromServer(formData);
  } catch (err) {
    return console.error("Failed to generate credential request options:", credentialCreateOptionsFromServer)
  }

  // convert certain members of the PublicKeyCredentialCreateOptions into
  // byte arrays as expected by the spec.
  const publicKeyCredentialCreateOptions = transformCredentialCreateOptions(credentialCreateOptionsFromServer);

  // request the authenticator(s) to create a new credential keypair.
  let credential;
  try {
    credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreateOptions
    });
  } catch (err) {
    return console.error("Error creating credential:", err);
  }

  // we now have a new credential! We now need to encode the byte arrays
  // in the credential into strings, for posting to our server.
  const newAssertionForServer = transformNewAssertionForServer(credential);

  // post the transformed credential data to the server for validation
  // and storing the public key
  let assertionValidationResponse;
  try {
    assertionValidationResponse = await postNewAssertionToServer(newAssertionForServer);
  } catch (err) {
    return console.error("Server validation of credential failed:", err);
  }

  // reload the page after a successful result
  window.location.reload();
}

/**
 * Get PublicKeyCredentialRequestOptions for this user from the server
 * formData of the registration form
 * @param {FormData} formData 
 */
const getCredentialRequestOptionsFromServer = async (formData) => {
  return await fetch_json(
    "/webauthn_begin_assertion", {
      method: "POST",
      body: formData
    }
  );
}

const transformCredentialRequestOptions = (credentialRequestOptionsFromServer) => {
  let {
    challenge,
    allowCredentials
  } = credentialRequestOptionsFromServer;

  challenge = Uint8Array.from(
    atob(challenge), c => c.charCodeAt(0));

  allowCredentials = allowCredentials.map(credentialDescriptor => {
    let {
      id
    } = credentialDescriptor;
    id = id.replace(/\_/g, "/").replace(/\-/g, "+");
    id = Uint8Array.from(atob(id), c => c.charCodeAt(0));
    return Object.assign({}, credentialDescriptor, {
      id
    });
  });

  const transformedCredentialRequestOptions = Object.assign({},
    credentialRequestOptionsFromServer, {
      challenge,
      allowCredentials
    });

  return transformedCredentialRequestOptions;
};


/**
 * Get PublicKeyCredentialRequestOptions for this user from the server
 * formData of the registration form
 * @param {FormData} formData 
 */
const getCredentialCreateOptionsFromServer = async (formData) => {
  return await fetch_json(
    "/webauthn_begin_activate", {
      method: "POST",
      body: formData
    }
  );
}

/**
 * Transforms items in the credentialCreateOptions generated on the server
 * into byte arrays expected by the navigator.credentials.create() call
 * @param {Object} credentialCreateOptionsFromServer 
 */
const transformCredentialCreateOptions = (credentialCreateOptionsFromServer) => {
  let {
    challenge,
    user
  } = credentialCreateOptionsFromServer;
  user.id = Uint8Array.from(
    atob(credentialCreateOptionsFromServer.user.id), c => c.charCodeAt(0));

  challenge = Uint8Array.from(
    atob(credentialCreateOptionsFromServer.challenge), c => c.charCodeAt(0));

  const transformedCredentialCreateOptions = Object.assign({}, credentialCreateOptionsFromServer, {
    challenge,
    user
  });

  return transformedCredentialCreateOptions;
}



/**
 * AUTHENTICATION FUNCTIONS
 */


/**
 * Callback executed after submitting login form
 * @param {Event} e 
 */
const didClickLogin = async (e) => {
  e.preventDefault();
  // gather the data in the form
  const form = document.querySelector('#unlock-form');
  let basicFormData = new FormData(form);
  basicFormData.delete("display_name");
  basicFormData.set("login_username", basicFormData.get('username'));
  basicFormData.delete("username");
  const formData = basicFormData;

  // post the login data to the server to retrieve the PublicKeyCredentialRequestOptions
  let credentialCreateOptionsFromServer;
  try {
    credentialRequestOptionsFromServer = await getCredentialRequestOptionsFromServer(formData);
  } catch (err) {
    return console.error("Error when getting request options from server:", err);
  }

  // convert certain members of the PublicKeyCredentialRequestOptions into
  // byte arrays as expected by the spec.    
  const transformedCredentialRequestOptions = transformCredentialRequestOptions(
    credentialRequestOptionsFromServer);

  // request the authenticator to create an assertion signature using the
  // credential private key
  let assertion;
  try {
    assertion = await navigator.credentials.get({
      publicKey: transformedCredentialRequestOptions,
    });
  } catch (err) {
    return console.error("Error when creating credential:", err);
  }

  // we now have an authentication assertion! encode the byte arrays contained
  // in the assertion data as strings for posting to the server
  const transformedAssertionForServer = transformAssertionForServer(assertion);

  // post the assertion to the server for verification.
  let response;
  try {
    response = await postAssertionToServer(transformedAssertionForServer);
  } catch (err) {
    return console.error("Error when validating assertion on server:", err);
  }

  window.location.reload();
};

/**
 * Transforms the binary data in the credential into base64 strings
 * for posting to the server.
 * @param {PublicKeyCredential} newAssertion 
 */
const transformNewAssertionForServer = (newAssertion) => {
  const attObj = new Uint8Array(
    newAssertion.response.attestationObject);
  const clientDataJSON = new Uint8Array(
    newAssertion.response.clientDataJSON);
  const rawId = new Uint8Array(
    newAssertion.rawId);

  const registrationClientExtensions = newAssertion.getClientExtensionResults();

  return {
    id: newAssertion.id,
    rawId: b64enc(rawId),
    type: newAssertion.type,
    attObj: b64enc(attObj),
    clientData: b64enc(clientDataJSON),
    registrationClientExtensions: JSON.stringify(registrationClientExtensions)
  };
}

/**
 * Posts the new credential data to the server for validation and storage.
 * @param {Object} credentialDataForServer 
 */
const postNewAssertionToServer = async (credentialDataForServer) => {
  const formData = new FormData();
  Object.entries(credentialDataForServer).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return await fetch_json(
    "/verify_credential_info", {
      method: "POST",
      body: formData
    });
}

/**
 * Encodes the binary data in the assertion into strings for posting to the server.
 * @param {PublicKeyCredential} newAssertion 
 */
const transformAssertionForServer = (newAssertion) => {
  const authData = new Uint8Array(newAssertion.response.authenticatorData);
  const clientDataJSON = new Uint8Array(newAssertion.response.clientDataJSON);
  const rawId = new Uint8Array(newAssertion.rawId);
  const sig = new Uint8Array(newAssertion.response.signature);
  const assertionClientExtensions = newAssertion.getClientExtensionResults();

  return {
    id: newAssertion.id,
    rawId: b64enc(rawId),
    type: newAssertion.type,
    authData: b64RawEnc(authData),
    clientData: b64RawEnc(clientDataJSON),
    signature: hexEncode(sig),
    assertionClientExtensions: JSON.stringify(assertionClientExtensions)
  };
};

/**
 * Post the assertion to the server for validation and logging the user in. 
 * @param {Object} assertionDataForServer 
 */
const postAssertionToServer = async (assertionDataForServer) => {
  const formData = new FormData();
  Object.entries(assertionDataForServer).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return await fetch_json(
    "/verify_assertion", {
      method: "POST",
      body: formData
    });
}



func = true

function switchFunction() {
  if (func == true) {
    document.querySelector('#unlock').removeEventListener('click', didClickLogin);
    document.querySelector("#displayName").classList.add("visible");
    document.querySelector('#unlock').addEventListener('click', didClickRegister);
    document.querySelector("#popup h1").innerText = "Register";
    document.querySelector("#popup h4 a").innerText = "Login"
  } else {
    document.querySelector('#unlock').removeEventListener('click', didClickRegister);
    document.querySelector("#displayName").classList.remove("visible");
    document.querySelector('#unlock').addEventListener('click', didClickLogin);
    document.querySelector("#popup h1").innerText = "Login";
    document.querySelector("#popup h4 a").innerText = "Register"
  }
  func = !func;
}
if (document.querySelector("#popup button")) {
  document.querySelector("#popup button").addEventListener("mousedown", () => {
    document.querySelector("#popup button div").animate([
      // keyframes
      {
        transform: 'translateX(-0.15em)'
      },
      {
        transform: 'translateX(0em)'
      },
      {
        transform: 'translateX(-0.15em)'
      }
    ], {
      duration: 1000,
    });
  });
}

function hint() {
  if (!func) {
    document.querySelector("#hint").classList.add("visible");
    var text;
    switch (this) {
      case document.querySelector("#username"):
        text = "Choose an\nalphanumeric\nusername.";
        break;
      case document.querySelector("#displayName"):
        text = "Use your real name\nfor best results.\n\xa0";
        break;
    }
    document.querySelector("#hint").innerText = text;
    this.addEventListener("focusout", removeHint);
  }
}

function removeHint() {
  document.querySelector("#hint").classList.remove("visible");
  document.querySelector("#hint").innerText = "\xa0\n\xa0\n\xa0";
  this.removeEventListener("focusout", removeHint);
}

document.addEventListener('DOMContentLoaded', () => {
setTimeout(() => {
  document.querySelector("#popup").classList.add("visible");
}, 100)
if (document.querySelector("#popup button")) {
  document.querySelector('#unlock').addEventListener('click', didClickLogin);
  document.querySelector("#popup h4 a").addEventListener('click', switchFunction);
  document.querySelector("#username").addEventListener("focus", hint);
  document.querySelector("#displayName").addEventListener("focus", hint);

}
}, false);

