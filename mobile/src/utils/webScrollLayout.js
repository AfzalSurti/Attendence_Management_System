import { StyleSheet } from 'react-native';

/** Shared layout styles: fixed title header + scrollable body on web */
export const webPageStyles = StyleSheet.create({
  webPage: {
    flex: 1,
    backgroundColor: '#f0f2ff',
    padding: 0,
  },
  webHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#f0f2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  webBody: {
    flex: 1,
  },
  webBodyContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
