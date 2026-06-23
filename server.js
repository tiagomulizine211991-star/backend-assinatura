const express = require('express');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

// 🔥 CAMINHO DO SEU JSON
const key = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidpublisher = google.androidpublisher({
  version: 'v3',
  auth,
});

// 🔥 ENDPOINT PARA VALIDAR ASSINATURA
app.post('/validar', async (req, res) => {
  try {
    const { packageName, subscriptionId, purchaseToken } = req.body;

    const response = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    const status = response.data.paymentState;

    if (status === 1) {
      return res.json({ ativo: true });
    } else {
      return res.json({ ativo: false });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao validar assinatura' });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});