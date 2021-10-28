import { Appbar, Avatar, Button, Card, Paragraph, Title } from 'react-native-paper';
import React, { useCallback, useEffect } from 'react';
import { SQIPCardEntry, SQIPCore } from 'react-native-square-in-app-payments';
import { ScrollView, View } from 'react-native';

const LeftContent = props => <Avatar.Icon {...props} icon="folder" />

export function HomeScreen() {
  useEffect(() => {
    SQIPCore.setSquareApplicationId('sandbox-sq0idb-EhYSbdLD1lZoBCA_LVMRGA');
  }, []);

  const onCardEntryComplete = useCallback(() => {
    console.log('onCardEntryComplete')
  });

  const onCardNonceRequestSuccess = useCallback(async (cardDetails) => {
    try {
      // take payment with the card details
      console.log(cardDetails);

      // payment finished successfully
      // you must call this method to close card entry
      await SQIPCardEntry.completeCardEntry(onCardEntryComplete);
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
    const cardEntryConfig = {
      collectPostalCode: false,
    };

    SQIPCardEntry.startCardEntryFlow(
      cardEntryConfig,
      onCardNonceRequestSuccess,
      onCardEntryCancel,
    );
  }, [onCardNonceRequestSuccess, onCardEntryCancel]);

  const items = [];
  for (let i = 0; i < 30; i++) {
    items.push(
      <View style={{ width: 180, margin: 10 }}>
        <Card id={i}>
          <Card.Title title="Card Title" subtitle="Card Subtitle" left={LeftContent} />
          <Card.Content>
            <Title>Non-profit org #{i + 1}</Title>
            <Paragraph>Card content</Paragraph>
          </Card.Content>
          <Card.Cover id={i} source={{ uri: `https://picsum.photos/${128 + i}` }} />
          <Card.Actions>
            <Button onPress={onStartCardEntry}>Donate</Button>
          </Card.Actions>
        </Card>
      </View>
    );
  }
  return (
    <View>
      <Appbar.Header>
        <Appbar.Content title="Onboarding project demo" subtitle="Payment" />
        <Appbar.Action icon="dots-vertical" onPress={() => { }} />
      </Appbar.Header>
      <ScrollView
        contentContainerStyle={{ alignItems: 'center' }}
        scrollIndicatorInsets={{ right: 1 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 170 }}>
          {items}
        </View>
      </ScrollView>
    </View>
  );
}
