import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

export const uploadImage = async (
  buffer: Buffer,
  folder: string = 'sinistros'
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `check-guincho/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!);
      }
    );
    
    uploadStream.end(buffer);
  });
};

export const uploadBase64Image = async (
  base64: string,
  folder: string = 'sinistros'
): Promise<UploadApiResponse> => {
  const dataUri = base64.startsWith('data:')
    ? base64
    : `data:image/jpeg;base64,${base64}`;

  return await cloudinary.uploader.upload(dataUri, {
    folder: `check-guincho/${folder}`,
    resource_type: 'image',
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ]
  });
};

export const deleteImage = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    return false;
  }
};
