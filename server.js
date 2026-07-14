const express = require('express');
const { google } = require('googleapis');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

/* =========================
   🔥 FIREBASE
========================= */

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
    const {
      packageName,
      subscriptionId,
      purchaseToken,
      email,
    } = req.body;

    if (typeof email !== 'string' || email.trim() === '') {
  return res.status(400).json({
    ativo: false,
    erro: 'E-mail do usuário não informado',
  });
}

    const emailNormalizado = email.trim().toLowerCase();

    const response =
        await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    const status = response.data.paymentState;

    if (status === 1) {
      await db.collection('usuarios').doc(emailNormalizado).set(
        {
          email: emailNormalizado,
          premium: true,
          atualizadoEm:
              admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      console.log(
        Usuário ${emailNormalizado} ativado como premium,
      );

      return res.json({ ativo: true });
    }

    return res.json({ ativo: false });
  } catch (error) {
    console.error('Erro ao validar:', error);

    return res.status(500).json({
      ativo: false,
      erro: 'Erro ao validar assinatura',
    });
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