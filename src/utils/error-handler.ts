import { Alert } from 'react-native';

export function handleError(error: unknown, fallbackMessage = 'Something went wrong'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallbackMessage;
}

export function showErrorAlert(error: unknown, title = 'Error') {
  const message = handleError(error);
  Alert.alert(title, message);
}
