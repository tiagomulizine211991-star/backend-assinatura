const express = require('express');
const { google } = require('googleapis');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

/* =========================
   🔥 FIREBASE
========================= */
console.log("FIREBASE:", process.env.FIREBASE_CREDENTIALS);
const firebaseKey = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(firebaseKey),
});

const db = admin.firestore();

/* =========================
   🔥 GOOGLE PLAY
========================= */
const key = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidpublisher = google.androidpublisher({
  version: 'v3',
  auth,
});

/* =========================
   🔥 VALIDAR ASSINATURA
========================= */
app.post('/validar', async (req, res) => {
  try {
    const { packageName, subscriptionId, purchaseToken, email } = req.body;

    const response = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    const status = response.data.paymentState;

    if (status === 1) {
      await db.collection('usuarios').doc(email).set({
        premium: true,
        atualizadoEm: new Date(),
      });

      console.log(`✅ Usuario ${email} ativado como premium`);

      return res.json({ ativo: true });
    } else {
      console.log(`❌ Assinatura inválida para ${email}`);
      return res.json({ ativo: false });
    }

  } catch (error) {
    console.error("Erro ao validar:", error);
    res.status(500).json({ erro: 'Erro ao validar assinatura' });
  }
});

/* =========================
   🔥 VERIFICAR USUÁRIO
========================= */
app.post('/verificar-usuario', async (req, res) => {
  try {
    const { email } = req.body;

    const doc = await db.collection('usuarios').doc(email).get();

    if (doc.exists && doc.data().premium === true) {
      return res.json({ ativo: true });
    }

    return res.json({ ativo: false });

  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    res.status(500).json({ erro: 'Erro ao verificar usuário' });
  }
});

/* =========================
   🔥 START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});