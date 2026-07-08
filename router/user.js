// routes/users.js
const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

// Controladores
const {
  Register,
  Login,
  RefreshToken,
  GetProfile,
  UpdateProfile,
  ChangePassword,
  DeleteAccount,
  ForgotPassword,
  Logout,
  ResetPassword,
  RevokeRefreshToken,
  SendVerificationEmail,
  VerifyEmail,
  GetAllUsers,
  GetUserById,
  GetAllRoles,
  GetRoleById,
  UpdateRole,
  GetRoleChangeHistory,
  GetRoleChangeHistoryCSV,
  UpdateProfileImage,
  GetProfileChangeHistory,
  GetProfileChangeHistoryCSV,
  GetForgotPasswordHistory,
  GetForgotPasswordHistoryCSV,
  GetPasswordChangeHistory,
  GetPasswordChangeHistoryCSV,
  GetLoginHistory,
  GetLoginHistoryCSV,
  GetRegisterHistory,
  GetRegisterHistoryCSV,
} = require('../controller/users');

// Middlewares
const handleValidationErrors = require('../middleware/handlevalidationerrors');
const validateLogin = require('../middleware/loginvalidator');
const validateUserRegister = require('../middleware/validateuserregister');
const authenticate = require('../middleware/verifytoken');
const authorize = require('../middleware/authorizerole');
const isOwnerOrAdmin = require('../middleware/isowneroradmin');
const loginLimiter = require('../services/rateLimiter/loginlimiter').rateLimiter;
const forgotPasswordLimiter = require('../services/rateLimiter/forgotpasswordlimiter').forgotPasswordLimiter;
const emailVerificationLimiter = require('../services/rateLimiter/emailverificationlimiter').emailVerificationLimiter;
const validateResetPassword = require('../middleware/validateresetpassword');
const validateChangePassword = require('../middleware/validatechangepassword');
const validateUserUpdate = require('../middleware/validateuserupdate');
const updateProfileLimiter = require('../services/rateLimiter/updateprofilelimiter').rateLimiter;
const uploadMemory = require('../middleware/bunny/uploadmemory');
const transformImage = require('../middleware/bunny/transformimage');
const validateUserIdParam = require('../middleware/validateuseridparam');
const validateRoleIdParam = require('../middleware/validateroleidparam');

// Rutas públicas
router.get('/', authenticate, authorize('superadmin'), GetAllUsers);
router.post('/register', validateUserRegister, handleValidationErrors, Register);
router.post('/login', loginLimiter, validateLogin, handleValidationErrors, Login);
router.post('/refresh-token', RefreshToken);
router.post('/forgot-password', forgotPasswordLimiter, [check('user_mail').isEmail().withMessage('Debe ser un correo válido')], handleValidationErrors, ForgotPassword);
router.post('/reset-password', forgotPasswordLimiter, validateResetPassword, handleValidationErrors, ResetPassword);
router.get('/roles', authenticate, authorize('admin', 'superadmin'), GetAllRoles);
router.post('/revoke-refresh-token', authenticate, authorize('admin', 'superadmin'), RevokeRefreshToken);
router.get('/role-history', authenticate, authorize('superadmin'), GetRoleChangeHistory);
router.get('/role-history/export', authenticate, authorize('superadmin'), GetRoleChangeHistoryCSV);
router.get('/profile-history', authenticate, authorize('superadmin'), GetProfileChangeHistory);
router.get('/profile-history/export', authenticate, authorize('superadmin'), GetProfileChangeHistoryCSV);
router.get('/forgot-password-history', authenticate, authorize('superadmin'), GetForgotPasswordHistory);
router.get('/forgot-password-history/export', authenticate, authorize('superadmin'), GetForgotPasswordHistoryCSV);
router.get('/password-change-history', authenticate, authorize('superadmin'), GetPasswordChangeHistory);
router.get('/password-change-history/export', authenticate, authorize('superadmin'), GetPasswordChangeHistoryCSV);
router.get('/login-history', authenticate, authorize('superadmin'), GetLoginHistory);
router.get('/login-history/export', authenticate, authorize('superadmin'), GetLoginHistoryCSV);
router.get('/register-history', authenticate, authorize('superadmin'), GetRegisterHistory);
router.get('/register-history/export', authenticate, authorize('superadmin'), GetRegisterHistoryCSV);

router.put('/update-image', authenticate, uploadMemory.single('image'), transformImage, UpdateProfileImage);

// Verificación de email
router.post('/send-verification-email', emailVerificationLimiter, [check('user_mail').isEmail().withMessage('Debe ser un correo válido')], handleValidationErrors, SendVerificationEmail);
router.get('/verify-email', VerifyEmail);

// Rutas protegidas con JWT
router.get('/profile', authenticate, GetProfile);
//router.get('/me/comments', authenticate, GetMyComments);
router.put('/update', authenticate, isOwnerOrAdmin(req => req.user.id),
  validateUserUpdate, handleValidationErrors, UpdateProfile);
router.post('/change-password', authenticate, validateChangePassword, handleValidationErrors, ChangePassword);
router.post('/logout', authenticate, Logout);

// Rutas de admin
router.get('/roles/:role_code', authenticate, authorize('admin', 'superadmin'), validateRoleIdParam, GetRoleById);
router.get('/:user_code', authenticate, authorize('admin', 'superadmin'), validateUserIdParam, GetUserById);
//router.get('/:user_code/profile-summary', GetUserProfileSummary);
router.delete('/:user_code', authenticate, isOwnerOrAdmin(req => parseInt(req.params.user_code, 10)), validateUserIdParam, DeleteAccount);
router.put('/role/:user_code', authenticate, authorize('superadmin'), validateUserIdParam, UpdateRole);

module.exports = router;
