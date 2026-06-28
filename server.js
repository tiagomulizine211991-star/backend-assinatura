const express = require('express');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

// 🔐 PEGA CREDENCIAL SEGURA DO RENDER
const key = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidpublisher = google.androidpublisher({
  version: 'v3',
  auth,
});

// 🔥 VALIDAR ASSINATURA
app.post('/validar', async (req, res) => {
  try {
    // 👇 SÓ ADICIONOU O EMAIL AQUI
    const { packageName, subscriptionId, purchaseToken, email } = req.body;

    const response = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    const status = response.data.paymentState;

    if (status === 1) {
      console.log(Usuário premium: ${email}); // 👈 só log por enquanto

      return res.json({ ativo: true });
    } else {
      return res.json({ ativo: false });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao validar assinatura' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(Servidor rodando na porta ${PORT});
});