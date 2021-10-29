import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';

import React from 'react';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
let waitTimer = -1;
let refCount = 0;

export class EasyLoading {
  static bind(loading) {
    this.control = loading;
  }

  static show() {
    if (refCount === 0) {
      if (waitTimer === -1) {
        waitTimer = setTimeout(() => {
          waitTimer = -1;
          this.control.setState({ isShow: true });
        }, 300);
      }
    }

    refCount++;
  }

  static dismiss() {
    if (refCount === 0) {
      console.error('wrong ref-count!');
      return;
    }

    refCount--;

    if (refCount === 0) {
      if (waitTimer === -1) {
        this.control.setState({ isShow: false });
      } else {
        clearTimeout(waitTimer);
        waitTimer = -1;
      }
    }
  }
}

EasyLoading.control = {};

export class Loading extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isShow: false
    };

    EasyLoading.bind(this);
  }

  render() {
    if (!this.state.isShow) {
      return <View />;
    }

    const loadingText = this.props.loadingText ? this.props.loadingText : 'Loading...';
    return (
      <View style={[styles.load_box, this.props.loadingStyle]}>
        <ActivityIndicator
          animating={true}
          color={this.props.color || '#FFF'}
          size={'large'}
          style={styles.load_progress}
        />
        <Text style={[styles.load_text, this.props.textStyle]}>{loadingText}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  load_box: {
    position: 'absolute',
    width: 100,
    height: 100,
    backgroundColor: '#0008',
    alignItems: 'center',
    marginLeft: SCREEN_WIDTH / 2 - 50,
    marginTop: SCREEN_HEIGHT / 2 - 50,
    borderRadius: 10
  },
  load_progress: {
    position: 'absolute',
    width: 100,
    height: 90
  },
  load_text: {
    marginTop: 70,
    color: '#FFF'
  }
});
