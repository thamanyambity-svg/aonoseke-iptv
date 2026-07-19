import { describe, it, expect } from 'vitest';
import { ErrorMessages, AppError } from '../errors';

describe('ErrorMessages', () => {
  it('has a playlist load error message', () => {
    expect(ErrorMessages.PLAYLIST_LOAD_FAILED).toBeTruthy();
  });

  it('has a channel load error message', () => {
    expect(ErrorMessages.STREAM_ERROR).toBeTruthy();
  });

  it('has a network error message', () => {
    expect(ErrorMessages.STREAM_UNAVAILABLE).toBeTruthy();
  });
});

describe('AppError', () => {
  it('creates error with code and message', () => {
    const error = new AppError('TEST_ERROR', 'Something went wrong');
    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe('TEST_ERROR');
  });

  it('has name set to AppError', () => {
    const error = new AppError('ERR', 'msg');
    expect(error.name).toBe('AppError');
  });

  it('accepts optional details', () => {
    const error = new AppError('ERR', 'msg', { key: 'value' });
    expect(error.details).toEqual({ key: 'value' });
  });
});
