import { Alert, ScrollView, View } from 'react-native';
import { BottomSheet, Button, Card, Divider, Header, Icon, ListItem, Text } from 'react-native-elements';
import React, { useCallback, useEffect, useState } from 'react';
import { SQIPCardEntry, SQIPCore } from 'react-native-square-in-app-payments';
import { addCard, createPayment, getCustomerInfo } from './utils';

export function HomeScreen() {
  const [customerInfo, setCustomerInfo] = useState(undefined);

  const loadCustomerInfo = useCallback(async () => {
    const info = await getCustomerInfo();
    if (!info) {
      Alert.alert('Network error!');
      return;
    }
    setCustomerInfo(info.body);
  }, [getCustomerInfo, setCustomerInfo]);

  const [charityList, setCharityList] = useState(undefined);

  useEffect(async () => {
    SQIPCore.setSquareApplicationId('sandbox-sq0idb-EhYSbdLD1lZoBCA_LVMRGA');

    // initialize charity list
    const list = [];
    for (let i = 0; i < 50; i++) {
      list.push({
        name: `Charity-${i + 1}`,
        amount: (i + 1) * 400,
        image: `https://picsum.photos/${200 + i}`
      });
    }
    setCharityList(list);

    loadCustomerInfo();
  }, []);

  const onCardEntryComplete = useCallback(() => {
    console.log('onCardEntryComplete');
  });

  const onCardNonceRequestSuccess = useCallback(async (cardDetails) => {
    try {
      await addCard(cardDetails.nonce);

      // payment finished successfully
      // you must call this method to close card entry
      await SQIPCardEntry.completeCardEntry(onCardEntryComplete);

      // reload customer info with latest card
      loadCustomerInfo();
    } catch (ex) {
      // payment failed to complete due to error
      // notify card entry to show processing error
      await SQIPCardEntry.showCardNonceProcessingError(ex.message);
    }
  });

  const onCardEntryCancel = useCallback(() => {
    console.log('onCardEntryCancel');
  });

  const onStartCardEntry = useCallback(() => {
    onDismissBottomSheet();

    const cardEntryConfig = {
      collectPostalCode: false
    };

    SQIPCardEntry.startCardEntryFlow(cardEntryConfig, onCardNonceRequestSuccess, onCardEntryCancel);
  }, [onCardNonceRequestSuccess, onCardEntryCancel]);

  const [selectCharity, setSelectCharity] = useState(undefined);

  const onDismissBottomSheet = useCallback(() => {
    setIsVisible(false);
  }, [setIsVisible]);

  const onShowBottomSheet = useCallback(
    (charity) => {
      setSelectCharity(charity);
      setIsVisible(true);
    },
    [setIsVisible]
  );

  let keyIndex = 0;
  const items = [];
  (charityList || []).forEach((item) => {
    const { name, amount, image } = item;
    const donate = `Donate $${(amount / 100).toFixed(0)}`;
    items.push(
      <View key={keyIndex++} style={{ width: '50%' }}>
        <Card>
          <Card.Title>{name}</Card.Title>
          <Card.Divider />
          <Card.Image
            source={{ uri: image }}
            style={{ borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomWidth: 0, height: 120 }}
          />
          <Button
            icon={<Icon name='favorite' color='#ffffff' style={{ marginRight: 7 }} />}
            title={donate}
            onPress={onShowBottomSheet.bind({}, item)}
          />
        </Card>
      </View>
    );
  });

  const onDonateWithCard = useCallback(async (cardId) => {
    onDismissBottomSheet();
    const result = await createPayment(cardId, selectCharity.amount);
    if (result.status === 201) {
      Alert.alert('Succeeded!');
    } else {
      Alert.alert('Failed with ' + result.status);
    }
  });

  const [isVisible, setIsVisible] = useState(false);
  const list = [];
  (customerInfo?.cards || []).forEach(({ cardBrand, expMonth, expYear, id, last4 }) => {
    list.push({
      iconProps: { name: 'credit-card' },
      title: `${cardBrand} - *${last4} (exp:${expMonth}/${expYear})`,
      onPress: () => {
        onDonateWithCard(id);
      }
    });
  });
  list.push({ iconProps: { name: 'add' }, title: 'Add a new card', onPress: onStartCardEntry });
  list.push({ iconProps: { name: 'close' }, title: 'Cancel', onPress: onDismissBottomSheet });

  return (
    <View style={{ flex: 1 }}>
      <Header
        leftComponent={{ icon: 'menu', color: '#fff', iconStyle: { color: '#fff' } }}
        centerComponent={{ text: 'Welcome to Donation App', style: { color: '#fff' } }}
        rightComponent={{ icon: 'home', color: '#fff' }}
      />
      <ScrollView contentContainerStyle={{ alignItems: 'center' }} scrollIndicatorInsets={{ right: 1 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{items}</View>
      </ScrollView>
      <BottomSheet isVisible={isVisible}>
        <View style={{ backgroundColor: 'white' }}>
          {selectCharity && (
            <Text style={{ fontSize: 14, margin: 10, fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
              Donate ${selectCharity.amount / 100} to {selectCharity.name}
            </Text>
          )}
          <Divider />
          {list.map((l, i) => (
            <ListItem key={i} containerStyle={l.containerStyle} onPress={l.onPress}>
              <Icon {...l.iconProps} />
              <ListItem.Content>
                <ListItem.Title style={l.titleStyle}>{l.title}</ListItem.Title>
              </ListItem.Content>
            </ListItem>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}
