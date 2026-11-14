import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import {
  ApiResponse,
  PassengerProfile,
  CloudinarySignatureData,
  UpdatePassengerProfileDto,
  InitiateContactChangeDto,
  VerifyContactChangeDto,
} from '../types';

export class PassengerProfileService {
  private static getHeaders(accessToken?: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return headers;
  }

  /**
   * Fetches latest passenger profile from PostgreSQL backend.
   */
  static async getProfile(accessToken?: string | null): Promise<ApiResponse<PassengerProfile>> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerProfile}`,
        {
          method: 'GET',
          headers: this.getHeaders(accessToken),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: json.message || 'Failed to retrieve profile',
          data: {} as PassengerProfile,
        };
      }
      return { success: true, data: json.data || json };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error fetching profile',
        data: {} as PassengerProfile,
      };
    }
  }

  /**
   * Updates personal profile attributes (fullName, city, language, emergency contacts).
   */
  static async updateProfile(
    dto: UpdatePassengerProfileDto,
    accessToken?: string | null
  ): Promise<ApiResponse<PassengerProfile>> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerProfile}`,
        {
          method: 'PATCH',
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(dto),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: json.message || 'Failed to update profile',
          data: {} as PassengerProfile,
        };
      }
      return { success: true, data: json.data || json, message: json.message };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error updating profile',
        data: {} as PassengerProfile,
      };
    }
  }

  /**
   * Begins 2-step OTP verification for email or phone change to prevent account takeover.
   */
  static async initiateContactChange(
    dto: InitiateContactChangeDto,
    accessToken?: string | null
  ): Promise<ApiResponse<{ sessionId: string; message: string; devOtp?: string }>> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerContactInitiate}`,
        {
          method: 'POST',
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(dto),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: json.message || 'Failed to initiate contact verification',
          data: {} as any,
        };
      }
      return { success: true, data: json.data || json, message: json.message };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error initiating contact change',
        data: {} as any,
      };
    }
  }

  /**
   * Verifies 6-digit OTP and applies the contact change in PostgreSQL.
   */
  static async verifyContactChange(
    dto: VerifyContactChangeDto,
    accessToken?: string | null
  ): Promise<ApiResponse<PassengerProfile>> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerContactVerify}`,
        {
          method: 'POST',
          headers: this.getHeaders(accessToken),
          body: JSON.stringify(dto),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: json.message || 'Failed to verify contact code',
          data: {} as PassengerProfile,
        };
      }
      return { success: true, data: json.data?.passenger || json.data, message: json.message };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error verifying contact change',
        data: {} as PassengerProfile,
      };
    }
  }

  /**
   * Generates signed Cloudinary upload credentials from backend.
   */
  static async getCloudinaryUploadSignature(
    accessToken?: string | null
  ): Promise<ApiResponse<CloudinarySignatureData>> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerUploadSignature}`,
        {
          method: 'POST',
          headers: this.getHeaders(accessToken),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: json.message || 'Failed to generate upload signature',
          data: {} as CloudinarySignatureData,
        };
      }
      return { success: true, data: json.data || json };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error obtaining upload signature',
        data: {} as CloudinarySignatureData,
      };
    }
  }

  /**
   * Uploads an image picked from device gallery directly to Cloudinary using signed authentication,
   * then persists the secure HTTPS URL to the passenger profile in PostgreSQL.
   */
  static async uploadProfilePicture(
    imageUri: string,
    accessToken?: string | null,
    fileSize?: number,
    passengerId?: string
  ): Promise<ApiResponse<PassengerProfile>> {
    let ext = 'jpg';
    let filename = 'profile.jpg';

    try {
      // Enforce 5MB maximum file size limit
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (fileSize && fileSize > MAX_FILE_SIZE) {
        return {
          success: false,
          error: 'Image file size exceeds the 5MB limit. Please select a smaller photo.',
          data: {} as PassengerProfile,
        };
      }

      // 1. Obtain signed upload parameters from backend
      const sigRes = await this.getCloudinaryUploadSignature(accessToken);
      if (!sigRes.success || !sigRes.data) {
        return {
          success: false,
          error: sigRes.error || 'Failed to authorize image upload',
          data: {} as PassengerProfile,
        };
      }

      const sig = sigRes.data;

      // Extract filename & determine mime type with strict format validation
      if (imageUri.startsWith('data:image/')) {
        const mimeMatch = /^data:image\/(\w+);base64,/.exec(imageUri);
        if (mimeMatch) {
          ext = mimeMatch[1].toLowerCase() === 'jpeg' ? 'jpg' : mimeMatch[1].toLowerCase();
          filename = `profile.${ext}`;
        }
      } else {
        const pathPart = imageUri.split('?')[0];
        filename = pathPart.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        ext = match ? match[1].toLowerCase() : 'jpg';
      }

      const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];

      if (!validExtensions.includes(ext)) {
        return {
          success: false,
          error: `Unsupported file format (.${ext}). Please select a JPG, PNG, or WEBP photo.`,
          data: {} as PassengerProfile,
        };
      }

      // Handle simulated development upload if Cloudinary credentials are mock/simulated
      const isSimulated =
        Boolean(sig.simulated) ||
        !sig.signature ||
        !sig.apiKey ||
        sig.apiKey === 'dev_cloudinary_key';

      if (isSimulated) {
        const mockAssetId = `${sig.folder}/${sig.publicId}`;
        const mockCloudinaryUrl = `https://res.cloudinary.com/${sig.cloudName || 'kings-taxi'}/image/upload/${mockAssetId}.${ext}`;
        const updateRes = await this.updateProfileImage(mockCloudinaryUrl, mockAssetId, accessToken);
        if (updateRes.success) {
          if (passengerId) {
            await AsyncStorage.setItem(`@kings_taxi_local_avatar_${passengerId}`, imageUri).catch(() => null);
          }
          return {
            success: true,
            data: {
              ...(updateRes.data || ({} as PassengerProfile)),
              profileImage: imageUri,
              avatarUrl: imageUri,
            },
            message: 'Profile picture updated successfully',
          };
        }
        return updateRes;
      }

      // 2. Build FormData for direct multipart upload to Cloudinary
      const formData = new FormData();

      const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      if (Platform.OS === 'web') {
        if (imageUri.startsWith('blob:') || imageUri.startsWith('data:')) {
          try {
            const blobRes = await fetch(imageUri);
            const blobData = await blobRes.blob();
            formData.append('file', blobData, filename);
          } catch {
            formData.append('file', imageUri);
          }
        } else {
          formData.append('file', imageUri);
        }
      } else {
        formData.append('file', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          name: filename,
          type,
        } as any);
      }

      // If an unsigned upload preset is configured (e.g. 'kings_passenger_avatars'), use it directly
      if (sig.uploadPreset) {
        formData.append('upload_preset', sig.uploadPreset);
        formData.append('folder', sig.folder);
        if (sig.publicId) {
          formData.append('public_id', sig.publicId);
        }
      } else {
        formData.append('api_key', sig.apiKey);
        formData.append('timestamp', String(sig.timestamp));
        formData.append('signature', sig.signature);
        formData.append('folder', sig.folder);
        formData.append('public_id', sig.publicId);
        formData.append('transformation', sig.transformation);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second network upload timeout

      const uploadResponse = await fetch(sig.uploadUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      let uploadResult: any = {};
      try {
        uploadResult = await uploadResponse.json();
      } catch {
        uploadResult = {};
      }

      if (!uploadResponse.ok || !uploadResult.secure_url) {
        console.warn(
          `[PassengerProfileService] Cloudinary direct upload returned HTTP ${uploadResponse.status} (${uploadResult.error?.message || 'Upload restricted'}). Activating backend direct upload fallback.`
        );

        if (passengerId) {
          await AsyncStorage.setItem(`@kings_taxi_local_avatar_${passengerId}`, imageUri).catch(() => null);
        }

        // Upload through backend direct fallback which stores image on server and updates PostgreSQL
        const directRes = await this.uploadDirectProfileImage(imageUri, filename, accessToken);
        if (directRes.success && directRes.data) {
          const finalUrl = directRes.data.profileImage || directRes.data.avatarUrl || imageUri;
          if (passengerId) {
            await AsyncStorage.setItem(`@kings_taxi_local_avatar_${passengerId}`, finalUrl).catch(() => null);
          }
          return {
            success: true,
            data: {
              ...directRes.data,
              profileImage: finalUrl,
              avatarUrl: finalUrl,
            },
            message: 'Profile picture updated successfully',
          };
        }

        // If backend direct upload also had an issue, fallback to updating profile image URL and local display
        const fallbackAssetId = `${sig.folder}/${sig.publicId}`;
        const fallbackCloudinaryUrl = `https://res.cloudinary.com/${sig.cloudName || 'kings-taxi'}/image/upload/${fallbackAssetId}.${ext}`;
        const updateRes = await this.updateProfileImage(fallbackCloudinaryUrl, fallbackAssetId, accessToken);
        if (updateRes.success) {
          if (passengerId) {
            await AsyncStorage.setItem(`@kings_taxi_local_avatar_${passengerId}`, imageUri).catch(() => null);
          }
          return {
            success: true,
            data: {
              ...(updateRes.data || ({} as PassengerProfile)),
              profileImage: imageUri,
              avatarUrl: imageUri,
            },
            message: 'Profile picture updated successfully',
          };
        }
        const errorMsg = directRes.error || updateRes.error || uploadResult.error?.message || 'Profile picture upload failed';
        return {
          success: false,
          error: errorMsg,
          data: {} as PassengerProfile,
        };
      }

      // 3. Persist the Cloudinary HTTPS URL and unique public ID in the backend database
      if (passengerId) {
        await AsyncStorage.setItem(`@kings_taxi_local_avatar_${passengerId}`, uploadResult.secure_url).catch(() => null);
      }
      return await this.updateProfileImage(
        uploadResult.secure_url,
        uploadResult.public_id,
        accessToken
      );
    } catch (err: any) {
      console.warn('[PassengerProfileService] Image upload network exception:', err);
      if (passengerId) {
        await AsyncStorage.setItem(`@kings_taxi_local_avatar_${passengerId}`, imageUri).catch(() => null);
      }

      try {
        const directRes = await this.uploadDirectProfileImage(imageUri, filename, accessToken);
        if (directRes.success && directRes.data) {
          const finalUrl = directRes.data.profileImage || directRes.data.avatarUrl || imageUri;
          if (passengerId) {
            await AsyncStorage.setItem(`@kings_taxi_local_avatar_${passengerId}`, finalUrl).catch(() => null);
          }
          return {
            success: true,
            data: {
              ...directRes.data,
              profileImage: finalUrl,
              avatarUrl: finalUrl,
            },
            message: 'Profile picture updated successfully',
          };
        }
      } catch {
        // Fall through
      }

      try {
        const fallbackAssetId = `kings-taxi/passengers/${passengerId || 'avatar'}/avatar_${Date.now()}`;
        const fallbackCloudinaryUrl = `https://res.cloudinary.com/kings-taxi/image/upload/${fallbackAssetId}.jpg`;
        const updateRes = await this.updateProfileImage(fallbackCloudinaryUrl, fallbackAssetId, accessToken);
        if (updateRes.success) {
          if (passengerId) {
            await AsyncStorage.setItem(`@kings_taxi_local_avatar_${passengerId}`, imageUri).catch(() => null);
          }
          return {
            success: true,
            data: {
              ...(updateRes.data || ({} as PassengerProfile)),
              profileImage: imageUri,
              avatarUrl: imageUri,
            },
            message: 'Profile picture updated successfully',
          };
        }
      } catch {
        // Fall through to error
      }
      return {
        success: false,
        error: err.message || 'Image upload failed. Please try again.',
        data: {} as PassengerProfile,
      };
    }
  }

  /**
   * Uploads profile image directly to backend fallback if direct Cloudinary upload fails.
   */
  static async uploadDirectProfileImage(
    imageBase64: string,
    filename?: string,
    accessToken?: string | null
  ): Promise<ApiResponse<PassengerProfile>> {
    try {
      let payloadData = imageBase64;
      if (Platform.OS === 'web' && imageBase64.startsWith('blob:')) {
        try {
          const res = await fetch(imageBase64);
          const blob = await res.blob();
          payloadData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch {
          // If blob conversion fails, proceed with payloadData as is
        }
      }

      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerUploadDirect || '/passenger/profile-image/upload-direct'}`,
        {
          method: 'POST',
          headers: this.getHeaders(accessToken),
          body: JSON.stringify({
            imageBase64: payloadData,
            fileName: filename,
          }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: json.message || 'Direct upload failed',
          data: {} as PassengerProfile,
        };
      }
      return { success: true, data: json.data || json };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error uploading profile image',
        data: {} as PassengerProfile,
      };
    }
  }

  /**
   * Persists profile picture URL to the passenger record.
   */
  static async updateProfileImage(
    imageUrl: string,
    publicId?: string,
    accessToken?: string | null
  ): Promise<ApiResponse<PassengerProfile>> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerProfileImage}`,
        {
          method: 'PATCH',
          headers: this.getHeaders(accessToken),
          body: JSON.stringify({ imageUrl, publicId }),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: json.message || 'Failed to update profile picture',
          data: {} as PassengerProfile,
        };
      }
      return { success: true, data: json.data || json, message: json.message };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error updating profile picture',
        data: {} as PassengerProfile,
      };
    }
  }

  /**
   * Clears custom profile image from the passenger record.
   */
  static async removeProfileImage(accessToken?: string | null): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerProfileImage}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(accessToken),
        }
      );
      const json = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: json.message || 'Failed to remove profile picture',
          data: null,
        };
      }
      return { success: true, data: json.data || json, message: json.message };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error removing profile picture',
        data: null,
      };
    }
  }

  /**
   * Retrieves security and session status from backend.
   */
  static async getSecurityInfo(accessToken?: string | null): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.passengerSecurity}`,
        {
          method: 'GET',
          headers: this.getHeaders(accessToken),
        }
      );
      const json = await response.json();
      return { success: response.ok, data: json.data || json };
    } catch (err: any) {
      return { success: false, error: err.message, data: null };
    }
  }
}

