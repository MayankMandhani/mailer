const express = require('express');
const app = express();
const port = 5000;git 
const fs=require('fs');
require('dotenv').config();
const {google}=require('googleapis');

//.env file stores the GOOGLE_CLIENTID and GOOLE_CLIENTSECRET, user is redirected to the following page when sgn in is successful. 
const googleConfig= {
  clientId: process.env.GOOGLE_CLIENTID,
  clientSecret: process.env.GOOGLE_CLIENTSECRET,
  redirect: "http://localhost:5000/loggedIn" //should match the link added in api settings
}

//scopes to grant required permissions for mailing
const defaultScope = [
  "https://www.googleapis.com/auth/plus.me",git 
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

//HELPER FUNCTIONS
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

//Required to have a google console account with google people and gmail api enabled having the clientid and client secret
function getGooglePeopleApi(auth) {
  return google.people({ version: "v1", auth });
}

//MAIN FUNCTIONS

//Create a Google URL and send to the client to log in the user.
function urlGoogle() {
  const auth = createConnection();
  const url = getConnectionUrl(auth);
  return url;
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

//Take the "code" parameter which Google gives us once when the user logs in, then get the user's email and id.
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
  //Store the credentials in a file
  fs.writeFileSync('creds.json', JSON.stringify(me))
  //Extract the email address from the credentials
  var myCred=fs.readFileSync('./creds.json');
  var credObj=JSON.parse(myCred);
  var meMail=credObj.data.emailAddresses[0].value;
  var raw = makeBody(
    [ "shubhamsachdeva593@gmail.com",
      "mandhani.mayank@gmail.com"
    ],
      meMail,
    "Hello",
    "This is sent from the GMail API."
  );  
  const gmail = google.gmail({ version: "v1", auth });
  const result = await gmail.users.messages.send({
    auth: auth,
    userId: "me",
    resource: {
      raw: raw,
    },
  });

  return result;
}

app.get("/", async (req, res) => {
  const url = await urlGoogle();
  console.log(process.env.GOOGLE_CLIENTID);
  res.redirect(url);
});

app.get("/loggedIn", async (req, res) => {
  const result = await getGoogleAccountFromCode(req.query.code);
  if (result.status == 200) return res.send("Mail Sent Successfully!");

  return res.send("Some error occured!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});
