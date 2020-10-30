const { google } = require("googleapis");
require("dotenv").config();
const fs = require("fs");
const googleConfig = {
  clientId: process.env.GOOGLE_CLIENTID, // e.g. asdfghjkljhgfdsghjk.apps.googleusercontent.com
  clientSecret: process.env.GOOGLE_CLIENTSECRET, // e.g. _ASDFA%DFASDFASDFASD#FAD-
  redirect: "http://localhost:5000/loggedIn", // this must match your google api settings
};

const defaultScope = [
  "https://www.googleapis.com/auth/plus.me",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/directory.readonly",
  "https://www.googleapis.com/auth/profile.agerange.read",
  "https://www.googleapis.com/auth/profile.emails.read",
  "https://www.googleapis.com/auth/profile.language.read",
  "https://www.googleapis.com/auth/user.addresses.read",
  "https://www.googleapis.com/auth/user.birthday.read",
  "https://www.googleapis.com/auth/user.emails.read",
  "https://www.googleapis.com/auth/user.gender.read",
  "https://www.googleapis.com/auth/user.organization.read",
  "https://www.googleapis.com/auth/user.phonenumbers.read",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
];

/*************/
/** HELPERS **/
/*************/

function createConnection() {
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirect
  );
}

function getConnectionUrl(auth) {
  return auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: defaultScope,
  });
}

function getGooglePeopleApi(auth) {
  return google.people({ version: "v1", auth });
}

/**********/
/** MAIN **/
/**********/

/**
 * Part 1: Create a Google URL and send to the client to log in the user.
 */
function urlGoogle() {
  const auth = createConnection();
  const url = getConnectionUrl(auth);
  return url;
}

/**
 * Part 2: Take the "code" parameter which Google gives us once when the user logs in, then get the user's email and id.
 */
async function getGoogleAccountFromCode(code) {
  const auth = createConnection();
  const data = await auth.getToken(code);
  const tokens = data.tokens;
  auth.setCredentials(tokens);
  const plus = getGooglePeopleApi(auth);
  const me = await plus.people.get({
    resourceName: "people/me",
    personFields: "names,emailAddresses",
  });

  fs.writeFileSync("creds.json", JSON.stringify(me));
  console.log(me);
  const gmail = google.gmail({ version: "v1", auth });
  var obj = fs.readFileSync("./creds.json");
  obj = JSON.parse(obj);
  var raw = makeBody(
    ["shubhamsachdeva593@gmail.com",
     "mandhani.mayank@gmail.com"],
    obj.data.emailAddresses[0].value,
    "NO",
    "This is sent from the gmail api."
  );
  const result = await gmail.users.messages.send({
    auth: auth,
    userId: "me",
    resource: {
      raw: raw,
    },
  });

  return result;
}

function makeBody(to, from, subject, message) {
  var str = [
    'Content-Type: text/plain; charset="UTF-8"\r\n',
    "MIME-Version: 1.0\r\n",
    "Content-Transfer-Encoding: 7bit\r\n",
    "to: ",
    to,
    "\r\n",
    "from: ",
    from,
    "\r\n",
    "subject: ",
    subject,
    "\r\n\r\n",
    message,
  ].join("");
  encodedMail = new Buffer(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return encodedMail;
}
async function sendMail() {
  const auth = createConnection();
  const data = await auth.getToken(code);
  const tokens = data.tokens;
  auth.setCredentials(tokens);
  const gmail = google.gmail({ version: "v1", auth });
  var raw = makeBody(
    "john g <asdfasdf@hotmail.com>",
    "john g<asfasdgf@gmail.com>",
    "test subject",
    "test message #2"
  );

  gmail.users.messages.send(
    {
      auth: auth,
      userId: "me",
      resource: {
        raw: raw,
      },
    },
    function (err, response) {
      return err || response;
    }
  );
}

const express = require("express");
const app = express();

app.get("/", async (req, res) => {
  const url = await urlGoogle();
  res.redirect(url);
});

app.get("/loggedIn", async (req, res) => {
  const result = await getGoogleAccountFromCode(req.query.code);
  if (result.status == 200) return res.send("Mail Sent Successfully!");

  return res.send("Some error occured!");
});

app.listen(5000, () => console.log("running"));
