// Unit tests for the authValidator express-validator chains.

const { validationResult } = require('express-validator');
const {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidator');

// Runs a validator chain array against a body payload and returns the
// list of validation-error messages (empty array = valid).
async function runValidator(validatorChain, body) {
  const req = { body, query: {}, params: {}, cookies: {}, headers: {} };
  for (const validator of validatorChain) {
    await validator.run(req);
  }
  const result = validationResult(req);
  return result.array().map((e) => e.msg);
}

describe('registerValidator', () => {
  test('passes with a fully valid payload', async () => {
    const errors = await runValidator(registerValidator, {
      name: 'Aarav Shrestha',
      email: 'aarav@example.com',
      phone: '+977-9812345678',
      password: 'Password123',
      consentGiven: true,
    });
    expect(errors).toEqual([]);
  });

  test('rejects an empty name', async () => {
    const errors = await runValidator(registerValidator, {
      name: '   ',
      email: 'aarav@example.com',
      password: 'Password123',
    });
    expect(errors).toContain('Name is required');
  });

  test('rejects a name longer than 100 characters', async () => {
    const errors = await runValidator(registerValidator, {
      name: 'A'.repeat(101),
      email: 'aarav@example.com',
      password: 'Password123',
    });
    expect(errors).toContain('Name must be 100 characters or fewer');
  });

  test('rejects a malformed email', async () => {
    const errors = await runValidator(registerValidator, {
      name: 'Aarav Shrestha',
      email: 'not-an-email',
      password: 'Password123',
    });
    expect(errors).toContain('Valid email is required');
  });

  test('rejects a password shorter than 6 characters', async () => {
    const errors = await runValidator(registerValidator, {
      name: 'Aarav Shrestha',
      email: 'aarav@example.com',
      password: '123',
    });
    expect(errors).toContain('Password must be between 6 and 128 characters');
  });

  test('rejects a password longer than 128 characters', async () => {
    const errors = await runValidator(registerValidator, {
      name: 'Aarav Shrestha',
      email: 'aarav@example.com',
      password: 'P'.repeat(129),
    });
    expect(errors).toContain('Password must be between 6 and 128 characters');
  });

  test('rejects a malformed phone number when phone is provided', async () => {
    const errors = await runValidator(registerValidator, {
      name: 'Aarav Shrestha',
      email: 'aarav@example.com',
      password: 'Password123',
      phone: 'abc',
    });
    expect(errors).toContain('Enter a valid phone number');
  });

  test('allows an empty phone (optional field)', async () => {
    const errors = await runValidator(registerValidator, {
      name: 'Aarav Shrestha',
      email: 'aarav@example.com',
      password: 'Password123',
      phone: '',
    });
    expect(errors).toEqual([]);
  });

  test('rejects a non-boolean consentGiven', async () => {
    const errors = await runValidator(registerValidator, {
      name: 'Aarav Shrestha',
      email: 'aarav@example.com',
      password: 'Password123',
      consentGiven: 'yes',
    });
    expect(errors).toContain('consentGiven must be a boolean');
  });
});

describe('loginValidator', () => {
  test('passes with a valid email and non-empty password', async () => {
    const errors = await runValidator(loginValidator, {
      email: 'aarav@example.com',
      password: 'whatever',
    });
    expect(errors).toEqual([]);
  });

  test('rejects a malformed email', async () => {
    const errors = await runValidator(loginValidator, {
      email: 'not-an-email',
      password: 'whatever',
    });
    expect(errors).toContain('Valid email is required');
  });

  test('rejects an empty password', async () => {
    const errors = await runValidator(loginValidator, {
      email: 'aarav@example.com',
      password: '',
    });
    expect(errors).toContain('Password is required');
  });
});

describe('updateProfileValidator', () => {
  test('passes when no fields are supplied (all optional)', async () => {
    const errors = await runValidator(updateProfileValidator, {});
    expect(errors).toEqual([]);
  });

  test('rejects an empty name when name is supplied', async () => {
    const errors = await runValidator(updateProfileValidator, { name: '   ' });
    expect(errors).toContain('Name cannot be empty');
  });

  test('rejects a malformed email when email is supplied', async () => {
    const errors = await runValidator(updateProfileValidator, { email: 'not-an-email' });
    expect(errors).toContain('Valid email is required');
  });
});

describe('changePasswordValidator', () => {
  test('passes with a valid, distinct new password', async () => {
    const errors = await runValidator(changePasswordValidator, {
      currentPassword: 'OldPassword1',
      newPassword: 'NewPassword1',
    });
    expect(errors).toEqual([]);
  });

  test('rejects an empty current password', async () => {
    const errors = await runValidator(changePasswordValidator, {
      currentPassword: '',
      newPassword: 'NewPassword1',
    });
    expect(errors).toContain('Current password is required');
  });

  test('rejects a new password shorter than 6 characters', async () => {
    const errors = await runValidator(changePasswordValidator, {
      currentPassword: 'OldPassword1',
      newPassword: '123',
    });
    expect(errors).toContain('New password must be at least 6 characters');
  });

  test('rejects a new password identical to the current password', async () => {
    const errors = await runValidator(changePasswordValidator, {
      currentPassword: 'SamePassword1',
      newPassword: 'SamePassword1',
    });
    expect(errors).toContain('New password must be different from current password');
  });
});

describe('forgotPasswordValidator', () => {
  test('passes with a valid email', async () => {
    const errors = await runValidator(forgotPasswordValidator, { email: 'aarav@example.com' });
    expect(errors).toEqual([]);
  });

  test('rejects a malformed email', async () => {
    const errors = await runValidator(forgotPasswordValidator, { email: 'not-an-email' });
    expect(errors).toContain('Valid email is required');
  });
});

describe('resetPasswordValidator', () => {
  test('passes with a token and a valid new password', async () => {
    const errors = await runValidator(resetPasswordValidator, {
      token: 'some-jwt-reset-token',
      password: 'NewPassword1',
    });
    expect(errors).toEqual([]);
  });

  test('rejects a missing token', async () => {
    const errors = await runValidator(resetPasswordValidator, {
      token: '',
      password: 'NewPassword1',
    });
    expect(errors).toContain('Reset token is required');
  });

  test('rejects a password shorter than 6 characters', async () => {
    const errors = await runValidator(resetPasswordValidator, {
      token: 'some-jwt-reset-token',
      password: '123',
    });
    expect(errors).toContain('Password must be at least 6 characters');
  });
});