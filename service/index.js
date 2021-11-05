const express = require('express');
const app = express();
const { Client, Environment } = require('square');
const { v4: uuidv4 } = require('uuid');

// Initialized the Square Api client:
//   Set environment
//   Set access token
const defaultClient = new Client({
  environment: process.env.ENVIRONMENT === 'PRODUCTION' ? Environment.Production : Environment.Sandbox,
  accessToken: process.env.ACCESS_TOKEN
});

const { paymentsApi, customersApi, cardsApi } = defaultClient;

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);

app.get('/', (req, res) => {
  res.send('Aloha!');
});

// Get or create customer info (including cards) via deviceId
app.post('/customer/:deviceId', async (req, res) => {
  const deviceId = req.params.deviceId;
  if (!deviceId) {
    res.status(400).send({ errorMessage: 'Invalid deviceId' });
    return;
  }

  try {
    // return if already exists
    const existingCustomerInfo = await getCustomer(deviceId);
    if (existingCustomerInfo) {
      sendCustomer(res, existingCustomerInfo);
      return;
    }

    // create new customer if not exist
    const customerInfo = await customersApi.createCustomer({
      idempotencyKey: uuidv4(),
      emailAddress: `${deviceId}@fake.com`
    });

    sendCustomer(res, customerInfo.result.customer);
  } catch (e) {
    console.log(`[Error] Status:${e.statusCode}, Messages: ${JSON.stringify(e.errors, null, 2)}`);
    sendErrorMessage(e.errors, res);
  }
});

// Create card for customer via deviceId
app.post('/card/:deviceId', async (req, res) => {
  const deviceId = req.params.deviceId;
  const { nonce } = req.body;

  try {
    const customerInfo = await getCustomer(deviceId);
    if (!customerInfo) {
      res.status(400).send({ errorMessage: "Customer doesn't exist" });
      return;
    }

    const cardInfo = await cardsApi.createCard({
      idempotencyKey: uuidv4(),
      sourceId: nonce,
      card: {
        customerId: customerInfo.id
      }
    });

    res.status(201).json(getCardJson(cardInfo.result.card));
  } catch (e) {
    console.log(`[Error] Status:${e.statusCode}, Messages: ${JSON.stringify(e.errors, null, 2)}`);
    sendErrorMessage(e.errors, res);
  }
});

// Create payment via deviceId
app.post('/payment/:deviceId', async (req, res) => {
  const deviceId = req.params.deviceId;
  const { cardId, amount } = req.body;

  try {
    const customerInfo = await getCustomer(deviceId);
    if (!customerInfo) {
      res.status(400).send({ errorMessage: "Customer doesn't exist" });
      return;
    }

    // verify cardId is from this customer
    const index = customerInfo.cards.findIndex((card) => card.id === cardId);
    if (index === -1) {
      res.status(400).send({ errorMessage: "Customer doesn't have this card" });
      return;
    }

    const paymentInfo = await paymentsApi.createPayment({
      sourceId: cardId,
      customerId: customerInfo.id,
      idempotencyKey: uuidv4(),
      amountMoney: {
        amount,
        currency: 'USD'
      }
    });

    const payment = paymentInfo.result.payment;
    res.status(201).json({ id: payment.id, status: payment.status });
  } catch (e) {
    console.log(`[Error] Status:${e.statusCode}, Messages: ${JSON.stringify(e.errors, null, 2)}`);
    sendErrorMessage(e.errors, res);
  }
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

const sendErrorMessage = (errors, response) => {
  switch (errors[0].code) {
    case 'UNAUTHORIZED':
      response.status(401).send({
        errorMessage: 'Server Not Authorized. Please check your server permission.'
      });
      break;
    case 'GENERIC_DECLINE':
      response.status(400).send({
        errorMessage: 'Card declined. Please re-enter card information.'
      });
      break;
    case 'CVV_FAILURE':
      response.status(400).send({
        errorMessage: 'Invalid CVV. Please re-enter card information.'
      });
      break;
    case 'ADDRESS_VERIFICATION_FAILURE':
      response.status(400).send({
        errorMessage: 'Invalid Postal Code. Please re-enter card information.'
      });
      break;
    case 'EXPIRATION_FAILURE':
      response.status(400).send({
        errorMessage: 'Invalid expiration date. Please re-enter card information.'
      });
      break;
    case 'INSUFFICIENT_FUNDS':
      response.status(400).send({
        errorMessage: 'Insufficient funds; Please try re-entering card details.'
      });
      break;
    case 'CARD_NOT_SUPPORTED':
      response.status(400).send({
        errorMessage:
          '	The card is not supported either in the geographic region or by the MCC; Please try re-entering card details.'
      });
      break;
    case 'PAYMENT_LIMIT_EXCEEDED':
      response.status(400).send({
        errorMessage: 'Processing limit for this merchant; Please try re-entering card details.'
      });
      break;
    case 'TEMPORARY_ERROR':
      response.status(500).send({
        errorMessage: 'Unknown temporary error; please try again;'
      });
      break;
    default:
      response.status(400).send({
        errorMessage: 'Payment error. Please contact support if issue persists.'
      });
      break;
  }
};

const getCustomer = async (deviceId) => {
  const email = `${deviceId}@fake.com`;
  const searchResult = await customersApi.searchCustomers({
    query: {
      filter: {
        emailAddress: {
          exact: email
        }
      }
    }
  });

  return searchResult.result.customers[0];
};

const sendCustomer = (res, customer) => {
  if (!customer) {
    res.status(404).send({ errorMessage: 'No customer data' });
    return;
  }

  // expMonth and expYear are BigInt, which isn't supported in JSON.stringify()
  const { id, familyName, givenName, companyName, phoneNumber, cards } = customer;
  res.json({
    id,
    familyName,
    givenName,
    companyName,
    phoneNumber,
    cards: (cards || []).map((card) => getCardJson(card))
  });
};

const getCardJson = (card) => ({
  ...card,
  expMonth: Number(card.expMonth),
  expYear: Number(card.expYear)
});
