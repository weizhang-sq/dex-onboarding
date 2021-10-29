import { Alert, Platform } from 'react-native';

import Constants from 'expo-constants';
import { EasyLoading } from './EasyLoading';

const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000';

const httpHeaders = {
  pragma: 'no-cache',
  'cache-control': 'no-cache',
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'Accept-Encoding': 'gzip'
};

const getHttpRequest = async (endpoint, method = 'GET', body = undefined) => {
  try {
    EasyLoading.show();

    const config = {
      method,
      headers: httpHeaders
    };

    if (body) {
      config.body = JSON.stringify(body);
    }
    const response = await fetch(`${baseUrl}${endpoint}`, config);

    return {
      headers: response.headers,
      status: response.status,
      body: await response.json()
    };
  } catch (error) {
    console.log(error);
    Alert.alert(error);
    return null;
  } finally {
    EasyLoading.dismiss();
  }
};

export const addCard = async (nonce) => {
  console.log('addCard', nonce);
  return getHttpRequest(`/card/${Constants.deviceId}`, 'POST', { nonce });
};

export const getCustomerInfo = async () => {
  console.log('getCustomerInfo');
  return getHttpRequest(`/customer/${Constants.deviceId}`, 'POST');
};

export const createPayment = async (cardId, amount) => {
  console.log('createPayment', cardId, amount);
  return getHttpRequest(`/payment/${Constants.deviceId}`, 'POST', { cardId, amount });
};
