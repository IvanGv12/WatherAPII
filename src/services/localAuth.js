const USERS_KEY = "weatherAppUsers";
const CURRENT_USER_KEY = "weatherAppCurrentUser";

function getStoredUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function removeCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export async function register(name, email, password, passwordConfirmation) {
  if (!name || !email || !password) {
    throw new Error("Todos los campos son obligatorios.");
  }
  if (password !== passwordConfirmation) {
    throw new Error("Las contraseñas deben coincidir.");
  }
  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  const users = getStoredUsers();
  const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error("Ya existe un usuario con ese correo.");
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
  };

  users.push(newUser);
  saveUsers(users);
  saveCurrentUser({ id: newUser.id, name: newUser.name, email: newUser.email });
  return { id: newUser.id, name: newUser.name, email: newUser.email };
}

export async function login(email, password) {
  if (!email || !password) {
    throw new Error("Correo y contraseña son obligatorios.");
  }

  const users = getStoredUsers();
  const user = users.find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password
  );
  if (!user) {
    throw new Error("Correo o contraseña incorrectos.");
  }

  saveCurrentUser({ id: user.id, name: user.name, email: user.email });
  return { id: user.id, name: user.name, email: user.email };
}

export async function logout() {
  removeCurrentUser();
}

export async function getUser() {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
