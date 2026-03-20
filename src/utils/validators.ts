export const validateEmail = (email: string): string | null => {
  if (!email) return 'El correo es requerido';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Formato de correo inválido';
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'La contraseña es requerida';
  if (password.length < 6) return `Mínimo 6 caracteres (${password.length}/6)`;
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) return 'El teléfono es requerido';
  if (phone.length !== 10) return `Debe tener 10 dígitos (${phone.length}/10)`;
  if (!/^\d+$/.test(phone)) return 'Solo números permitidos';
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name) return 'Este campo es requerido';
  if (name.length < 2) return 'Mínimo 2 caracteres';
  return null;
};
