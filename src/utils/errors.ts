/**
 * Error types and custom error classes
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('NETWORK_ERROR', message, details);
    this.name = 'NetworkError';
  }
}

export class StorageError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('STORAGE_ERROR', message, details);
    this.name = 'StorageError';
  }
}

export const ErrorMessages = {
  PLAYLIST_LOAD_FAILED: 'Impossible de charger la playlist. Vérifiez votre connexion.',
  PLAYLIST_INVALID: 'Format de playlist invalide.',
  STREAM_UNAVAILABLE: 'Flux inaccessible — réseau ou lien expiré.',
  STREAM_ERROR: 'Erreur fatale — chaîne indisponible.',
  HLS_NOT_SUPPORTED: 'Votre navigateur ne supporte pas HLS.',
  STORAGE_QUOTA_EXCEEDED: 'Stockage local plein.',
  INVALID_URL: 'URL invalide.',
} as const;
