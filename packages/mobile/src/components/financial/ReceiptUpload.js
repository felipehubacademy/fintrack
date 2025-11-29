import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Camera, Image as ImageIcon, X, Upload } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Caption } from '../ui/Text';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase';
import { useToast } from '../ui/Toast';

// Lazy import do ImagePicker para evitar erro se módulo nativo não estiver disponível
let ImagePicker = null;
const getImagePicker = async () => {
  if (!ImagePicker) {
    try {
      // Import dinâmico do módulo
      const module = await import('expo-image-picker');
      // expo-image-picker exporta tudo como named exports, então usamos o módulo diretamente
      ImagePicker = module;
      return ImagePicker;
    } catch (error) {
      console.error('expo-image-picker não disponível:', error);
      return null;
    }
  }
  return ImagePicker;
};

export function ReceiptUpload({ onUploadComplete, onRemove, initialImageUrl, organizationId, userId }) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [imageUri, setImageUri] = useState(initialImageUrl || null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const ImagePickerModule = await getImagePicker();
      if (!ImagePickerModule) {
        showToast('Funcionalidade de imagem não disponível', 'error');
        return false;
      }
      const { status: cameraStatus } = await ImagePickerModule.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePickerModule.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'Permissões necessárias',
          'Permissões de câmera e galeria são necessárias para fazer upload de comprovantes.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const ImagePickerModule = await getImagePicker();
    if (!ImagePickerModule) {
      showToast('Funcionalidade de imagem não disponível', 'error');
      return;
    }
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePickerModule.launchImageLibraryAsync({
        mediaTypes: ImagePickerModule.MediaType.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showToast('Erro ao selecionar imagem', 'error');
    }
  };

  const takePhoto = async () => {
    const ImagePickerModule = await getImagePicker();
    if (!ImagePickerModule) {
      showToast('Funcionalidade de imagem não disponível', 'error');
      return;
    }
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePickerModule.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      showToast('Erro ao tirar foto', 'error');
    }
  };

  const handleImageSelected = async (uri) => {
    setImageUri(uri);
    await uploadImage(uri);
  };

  const uploadImage = async (uri) => {
    if (!organizationId || !userId) {
      showToast('Organização ou usuário não encontrado', 'error');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Criar nome único para o arquivo
      const timestamp = Date.now();
      const fileName = `${userId}/${timestamp}_receipt.jpg`;
      const filePath = `receipts/${organizationId}/${fileName}`;

      // Converter URI para blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from('receipts').getPublicUrl(filePath);

      setImageUri(publicUrl);
      setUploadProgress(100);

      if (onUploadComplete) {
        onUploadComplete(publicUrl, filePath);
      }

      showToast('Comprovante enviado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      showToast('Erro ao fazer upload do comprovante', 'error');
      setImageUri(null);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleRemove = () => {
    setImageUri(null);
    if (onRemove) {
      onRemove();
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Selecionar Comprovante',
      'Escolha uma opção',
      [
        {
          text: 'Tirar Foto',
          onPress: takePhoto,
        },
        {
          text: 'Escolher da Galeria',
          onPress: pickImageFromGallery,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  if (imageUri) {
    return (
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          {!uploading && (
            <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
              <X size={20} color={colors.background.primary} />
            </TouchableOpacity>
          )}
        </View>
        {uploading && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={colors.brand.primary} />
            <Caption color="secondary" style={{ marginLeft: spacing[1] }}>
              Enviando... {uploadProgress}%
            </Caption>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
        onPress={showImagePickerOptions}
        disabled={uploading}
        activeOpacity={0.7}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.brand.primary} />
        ) : (
          <>
            <Upload size={24} color={colors.brand.primary} />
            <Text style={styles.uploadButtonText}>Adicionar Comprovante</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={takePhoto}
          disabled={uploading}
          activeOpacity={0.7}
        >
          <Camera size={20} color={colors.brand.primary} />
          <Caption color="secondary">Tirar Foto</Caption>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={pickImageFromGallery}
          disabled={uploading}
          activeOpacity={0.7}
        >
          <ImageIcon size={20} color={colors.brand.primary} />
          <Caption color="secondary">Galeria</Caption>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[2],
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border.light,
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
    gap: spacing[2],
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: colors.brand.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  optionButton: {
    alignItems: 'center',
    gap: spacing[0.5],
    padding: spacing[1],
  },
  imageContainer: {
    position: 'relative',
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
  },
  removeButton: {
    position: 'absolute',
    top: spacing[1],
    right: spacing[1],
    backgroundColor: colors.error.main,
    borderRadius: radius.full,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
});

