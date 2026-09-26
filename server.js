const express = require('express');
const { google } = require('googleapis');
const admin = require('firebase-admin');
const crypto = require('crypto');
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
    } = req.body;

    console.log("================================");
    console.log("VALIDANDO ASSINATURA");
    console.log("Package:", packageName);
    console.log("Plano:", subscriptionId);
    console.log("Token recebido:", !!purchaseToken);

    if (
      typeof packageName !== "string" ||
      typeof subscriptionId !== "string" ||
      typeof purchaseToken !== "string" ||
      packageName.trim() === "" ||
      subscriptionId.trim() === "" ||
      purchaseToken.trim() === ""
    ) {
      return res.status(400).json({
        ativo: false,
        erro: "Dados inválidos",
      });
    }

    // Planos aceitos
    const planosPermitidos = [
  "assinatura_mensal",
  "mensal",
  "trimestral",
  "semestral",
  "anual",
];

    if (!planosPermitidos.includes(subscriptionId.trim())) {
      console.log("Plano inválido:", subscriptionId);

      return res.status(400).json({
        ativo: false,
        erro: "Plano não permitido",
      });
    }

    let response = null;
let planoValidado = null;

const planosParaTestar = [
  subscriptionId.trim(),
  "assinatura_mensal",
];

for (const plano of planosParaTestar) {
  try {
    response =
      await androidpublisher.purchases.subscriptions.get({
        packageName: packageName.trim(),
        subscriptionId: plano,
        token: purchaseToken.trim(),
      });

    planoValidado = plano;

    console.log(Assinatura encontrada no plano: ${plano});

    break;

  } catch (e) {

    console.log(Plano ${plano} não encontrado.);

  }
}

if (!response) {
  return res.status(404).json({
    ativo: false,
    erro: "Assinatura não encontrada.",
  });
}

    console.log(response.data);

    const paymentState =
      response.data.paymentState;

    const expiryTime =
      Number(response.data.expiryTimeMillis ?? 0);

    const ativa =
      paymentState === 1 &&
      (expiryTime === 0 ||
        expiryTime > Date.now());

    const assinaturaId = crypto
      .createHash("sha256")
      .update(purchaseToken.trim())
      .digest("hex");

    await db
      .collection("assinaturas")
      .doc(assinaturaId)
      .set(
        {
          packageName: packageName.trim(),
          subscriptionId: planoValidado,
          ativa,
          paymentState,
          expiryTimeMillis: expiryTime,
          atualizadoEm:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log(
      ativa
        ? "ASSINATURA ATIVA"
        : "ASSINATURA INATIVA"
    );

    return res.json({
      ativo: ativa,
      subscriptionId: planoValidado,
      expiraEm: expiryTime,
    });

  } catch (e) {
    console.error(e);

    return res.status(500).json({
      ativo: false,
      erro: e.message,
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