import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// Enhanced file validation configuration
export const FILE_VALIDATION_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ] as const,
  ALLOWED_EXTENSIONS: [
    'jpg',
    'jpeg',
    'png', 
    'webp',
    'gif'
  ] as const,
  UPLOAD_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
} as const;

export interface FileValidationResult {
  isValid: boolean;
  mimeType?: string;
  extension?: string;
  size: number;
  errors: string[];
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
  };
}

export interface UploadToken {
  stagingRequestId: string;
  allowedMimeTypes: readonly string[];
  maxSize: number;
  expiresAt: number;
  signature: string;
}

export class FileValidationService {
  private readonly secretKey: string;

  constructor() {
    // Use environment variable or generate a session key for token signing
    this.secretKey = process.env.FILE_UPLOAD_SECRET || this.generateSessionKey();
    if (!process.env.FILE_UPLOAD_SECRET) {
      console.warn('FILE_UPLOAD_SECRET not set. Using session-generated key. Tokens will not persist across restarts.');
    }
  }

  private generateSessionKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generates a secure upload token that cryptographically binds upload permissions
   * to a specific staging request with time-limited validity
   */
  generateUploadToken(
    stagingRequestId: string,
    allowedMimeTypes: readonly string[] = FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES,
    maxSize: number = FILE_VALIDATION_CONFIG.MAX_FILE_SIZE
  ): string {
    const expiresAt = Date.now() + FILE_VALIDATION_CONFIG.UPLOAD_TOKEN_EXPIRY;
    
    const payload = {
      stagingRequestId: stagingRequestId.trim(),
      allowedMimeTypes,
      maxSize,
      expiresAt
    };

    const signature = this.signPayload(payload);
    
    const token: UploadToken = {
      ...payload,
      signature
    };

    return Buffer.from(JSON.stringify(token)).toString('base64url');
  }

  /**
   * Validates and decodes an upload token, ensuring cryptographic integrity
   */
  validateUploadToken(tokenString: string): UploadToken | null {
    try {
      const tokenData = JSON.parse(Buffer.from(tokenString, 'base64url').toString('utf8')) as UploadToken;
      
      // Check expiry
      if (Date.now() > tokenData.expiresAt) {
        console.warn('Upload token expired', { expiresAt: tokenData.expiresAt, now: Date.now() });
        return null;
      }

      // Verify signature
      const expectedSignature = this.signPayload({
        stagingRequestId: tokenData.stagingRequestId,
        allowedMimeTypes: tokenData.allowedMimeTypes,
        maxSize: tokenData.maxSize,
        expiresAt: tokenData.expiresAt
      });

      if (!this.verifySignature(tokenData.signature, expectedSignature)) {
        console.warn('Upload token signature verification failed');
        return null;
      }

      return tokenData;
    } catch (error) {
      console.warn('Failed to validate upload token:', error);
      return null;
    }
  }

  private signPayload(payload: Omit<UploadToken, 'signature'>): string {
    const message = JSON.stringify(payload);
    return createHash('sha256')
      .update(this.secretKey)
      .update(message)
      .digest('hex');
  }

  private verifySignature(provided: string, expected: string): boolean {
    if (provided.length !== expected.length) {
      return false;
    }
    
    const providedBuffer = Buffer.from(provided, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    
    return timingSafeEqual(providedBuffer, expectedBuffer);
  }

  /**
   * Validates file content server-side using actual file analysis
   * This cannot be spoofed by clients unlike HTTP headers
   */
  async validateFileContent(fileBuffer: Buffer, expectedToken?: UploadToken): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: false,
      size: fileBuffer.length,
      errors: []
    };

    try {
      // Step 1: File size validation
      const maxSize = expectedToken?.maxSize || FILE_VALIDATION_CONFIG.MAX_FILE_SIZE;
      if (fileBuffer.length > maxSize) {
        result.errors.push(`File size ${fileBuffer.length} bytes exceeds maximum allowed ${maxSize} bytes`);
      }

      if (fileBuffer.length === 0) {
        result.errors.push('File is empty');
      }

      // Step 2: MIME type detection from actual file content (magic bytes)
      const detectedType = await fileTypeFromBuffer(fileBuffer);
      
      if (!detectedType) {
        result.errors.push('Unable to detect file type from content');
        return result;
      }

      result.mimeType = detectedType.mime;
      result.extension = detectedType.ext;

      // Step 3: Validate against allowed types
      const allowedTypes = expectedToken?.allowedMimeTypes || FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES;
      
      if (!allowedTypes.includes(detectedType.mime as any)) {
        result.errors.push(`File type ${detectedType.mime} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }

      // Step 4: Image-specific validation using Sharp
      if (detectedType.mime.startsWith('image/')) {
        try {
          const imageMetadata = await sharp(fileBuffer).metadata();
          
          result.metadata = {
            width: imageMetadata.width,
            height: imageMetadata.height,
            format: imageMetadata.format
          };

          // Additional image validation rules
          if (imageMetadata.width && imageMetadata.height) {
            const maxDimension = 8192; // Max 8K resolution
            if (imageMetadata.width > maxDimension || imageMetadata.height > maxDimension) {
              result.errors.push(`Image dimensions ${imageMetadata.width}x${imageMetadata.height} exceed maximum ${maxDimension}x${maxDimension}`);
            }

            const minDimension = 50; // Min 50px
            if (imageMetadata.width < minDimension || imageMetadata.height < minDimension) {
              result.errors.push(`Image dimensions ${imageMetadata.width}x${imageMetadata.height} below minimum ${minDimension}x${minDimension}`);
            }
          }

          // Check for animated GIFs if needed
          if (detectedType.mime === 'image/gif' && imageMetadata.pages && imageMetadata.pages > 1) {
            // Animated GIF detected - could add specific rules here
            console.log(`Animated GIF detected with ${imageMetadata.pages} frames`);
          }

        } catch (imageError) {
          const error = imageError as Error;
          result.errors.push(`Invalid or corrupted image file: ${error.message}`);
        }
      }

      // Step 5: Final validation
      result.isValid = result.errors.length === 0;

      return result;

    } catch (err) {
      const error = err as Error;
      result.errors.push(`File validation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Validates file upload request parameters against security requirements
   */
  validateUploadRequest(params: {
    stagingRequestId?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    uploadToken?: string;
  }): { isValid: boolean; errors: string[]; token?: UploadToken } {
    const errors: string[] = [];

    // Validate staging request ID
    if (!params.stagingRequestId || typeof params.stagingRequestId !== 'string' || params.stagingRequestId.trim().length === 0) {
      errors.push('Valid staging request ID is required');
    }

    // Validate file name
    if (!params.fileName || typeof params.fileName !== 'string' || params.fileName.trim().length === 0) {
      errors.push('Valid file name is required');
    } else {
      // Enhanced path traversal and security checks
      const normalizedName = params.fileName.trim();
      
      // Check for path traversal attempts
      if (normalizedName.includes('..') || 
          normalizedName.includes('/') || 
          normalizedName.includes('\\') ||
          normalizedName.includes('\0') ||  // Null byte injection
          normalizedName.match(/[<>:"|?*]/) || // Windows invalid chars
          normalizedName.startsWith('.') ||    // Hidden files
          normalizedName.length > 255) {       // Excessive length
        errors.push('File name contains invalid characters or path traversal attempts');
      }
      
      // Additional security checks
      const lowerName = normalizedName.toLowerCase();
      if (lowerName.endsWith('.exe') || 
          lowerName.endsWith('.bat') || 
          lowerName.endsWith('.cmd') || 
          lowerName.endsWith('.scr') ||
          lowerName.endsWith('.php') ||
          lowerName.endsWith('.jsp') ||
          lowerName.endsWith('.asp')) {
        errors.push('Executable and script file extensions are not allowed');
      }
    }

    // Validate upload token if provided
    let token: UploadToken | undefined;
    if (params.uploadToken) {
      token = this.validateUploadToken(params.uploadToken) || undefined;
      if (!token) {
        errors.push('Invalid or expired upload token');
      } else {
        // Verify token matches staging request
        if (token.stagingRequestId !== params.stagingRequestId?.trim()) {
          errors.push('Upload token does not match staging request ID');
        }
      }
    }

    // Basic file size validation (will be verified again server-side)
    if (params.fileSize !== undefined) {
      if (typeof params.fileSize !== 'number' || params.fileSize <= 0) {
        errors.push('File size must be a positive number');
      } else {
        const maxSize = token?.maxSize || FILE_VALIDATION_CONFIG.MAX_FILE_SIZE;
        if (params.fileSize > maxSize) {
          errors.push(`File size ${params.fileSize} exceeds maximum ${maxSize} bytes`);
        }
      }
    }

    // Basic file type validation (will be verified again server-side)
    if (params.fileType) {
      const allowedTypes = token?.allowedMimeTypes || FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES;
      if (!allowedTypes.includes(params.fileType.toLowerCase() as any)) {
        errors.push(`File type ${params.fileType} is not allowed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      token
    };
  }

  /**
   * Logs security violations for monitoring and analysis
   */
  logSecurityViolation(violation: {
    type: 'INVALID_TOKEN' | 'FILE_TYPE_MISMATCH' | 'SIZE_EXCEEDED' | 'UNAUTHORIZED_ACCESS';
    details: Record<string, any>;
    userAgent?: string;
    ipAddress?: string;
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      violation: violation.type,
      details: violation.details,
      userAgent: violation.userAgent,
      ipAddress: violation.ipAddress
    };

    // Log to console (in production, you'd want to send to a security monitoring service)
    console.warn('SECURITY VIOLATION:', JSON.stringify(logEntry, null, 2));

    // In production, you might want to:
    // - Send to a SIEM system
    // - Trigger alerts for repeated violations
    // - Implement rate limiting based on violations
    // - Store in a security audit log database
  }
}

// Export singleton instance
export const fileValidationService = new FileValidationService();