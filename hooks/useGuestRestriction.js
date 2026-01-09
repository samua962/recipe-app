// hooks/useGuestRestriction.js
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useGuest } from '../contexts/GuestContext';

export default function useGuestRestriction() {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({});
  const { isGuest } = useGuest();
  const navigation = useNavigation();

  const showGuestRestriction = (featureName, customTitle, customMessage) => {
    if (!isGuest) return true; // Allow if not guest
    
    setDialogConfig({
      featureName,
      title: customTitle,
      message: customMessage,
    });
    setShowDialog(true);
    return false; // Restrict if guest
  };

  const handleDialogClose = () => {
    setShowDialog(false);
  };

  const handleLoginPress = () => {
    setShowDialog(false);
    navigation.navigate('Login');
  };

  const getDialogProps = () => ({
    visible: showDialog,
    onClose: handleDialogClose,
    onLoginPress: handleLoginPress,
    featureName: dialogConfig.featureName,
    title: dialogConfig.title,
    message: dialogConfig.message,
  });

  return {
    isGuest,
    showGuestRestriction,
    getDialogProps,
    GuestDialogProps: getDialogProps(),
  };
}