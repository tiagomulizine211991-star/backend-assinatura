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

    console.log('Recebida solicitação de validação', {
      packageName,
      subscriptionId,
      possuiToken:
        typeof purchaseToken === 'string' &&
        purchaseToken.trim() !== '',
    });

    if (
      typeof packageName !== 'string' ||
      packageName.trim() === '' ||
      typeof subscriptionId !== 'string' ||
      subscriptionId.trim() === '' ||
      typeof purchaseToken !== 'string' ||
      purchaseToken.trim() === ''
    ) {
      return res.status(400).json({
        ativo: false,
        erro: 'Dados da compra incompletos',
      });
    }

    const response =
        await androidpublisher.purchases.subscriptions.get({
      packageName: packageName.trim(),
      subscriptionId: subscriptionId.trim(),
      token: purchaseToken.trim(),
    });

    const statusPagamento = response.data.paymentState;
    const dataExpiracao = Number(
      response.data.expiryTimeMillis ?? 0,
    );

    const pagamentoConfirmado =
        statusPagamento === 1;

    const naoExpirada =
        dataExpiracao === 0 ||
        dataExpiracao > Date.now();

    const ativa =
        pagamentoConfirmado && naoExpirada;

    const assinaturaId = crypto
        .createHash('sha256')
        .update(purchaseToken.trim())
        .digest('hex');

    await db
        .collection('assinaturas')
        .doc(assinaturaId)
        .set(
      {
        packageName: packageName.trim(),
        subscriptionId: subscriptionId.trim(),
        ativa,
        paymentState: statusPagamento ?? null,
        expiryTimeMillis:
            response.data.expiryTimeMillis ?? null,
        atualizadoEm:
            admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    console.log(
      ativa
          ? 'Assinatura ativa confirmada'
          : 'Assinatura inativa ou expirada',
    );

    return res.json({ ativo: ativa });
  } catch (error) {
    console.error('Erro ao validar assinatura:', error);

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