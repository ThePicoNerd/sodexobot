const admin = require("firebase-admin");

let serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString();

let serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

module.exports = db;