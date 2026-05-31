import { supabase } from './supabase-client.js'

// ─── RUTAS POR ROL ───────────────────────────────────────────────
const RUTAS = {
  super_admin:   '/screens/dashboard_maestro_super_admin.html',
  admin_clinica: '/screens/dashboard_admin_clinica.html',
  psicologo:     '/screens/dashboard_psicologo.html',
  secretario:    '/screens/dashboard_psicologo.html',
  paciente:      '/screens/portal_paciente_inicio.html',
}

// ─── OBTENER PERFIL DEL USUARIO ──────────────────────────────────
export async function obtenerPerfil(userId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido, email, rol, clinica_id, activo')
    .eq('id', userId)
    .single()

  if (error) throw new Error('No se pudo obtener el perfil del usuario.')
  return data
}

// ─── REDIRIGIR SEGÚN ROL ─────────────────────────────────────────
export function redirigirPorRol(rol) {
  const ruta = RUTAS[rol]
  if (ruta) {
    window.location.href = ruta
  } else {
    mostrarError('Rol de usuario no reconocido.')
  }
}

// ─── LOGIN CLÍNICA / PSICÓLOGO ───────────────────────────────────
export async function loginClinica({ clinicaId, email, password }) {
  // 1. Autenticar con Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (authError) throw new Error('Email o contraseña incorrectos.')

  // 2. Obtener perfil y validar
  const perfil = await obtenerPerfil(authData.user.id)

  if (!perfil.activo) {
    await supabase.auth.signOut()
    throw new Error('Tu cuenta está suspendida. Contactá al administrador.')
  }

  // 3. Verificar que el ID de clínica coincide
  if (perfil.rol !== 'super_admin' && perfil.clinica_id !== clinicaId) {
    await supabase.auth.signOut()
    throw new Error('El ID de clínica no coincide con tu cuenta.')
  }

  // 4. Guardar sesión en localStorage para uso en otras pantallas
  localStorage.setItem('tp_rol', perfil.rol)
  localStorage.setItem('tp_clinica_id', perfil.clinica_id)
  localStorage.setItem('tp_nombre', `${perfil.nombre} ${perfil.apellido}`)

  return perfil
}

// ─── LOGIN PACIENTE CON CONTRASEÑA ───────────────────────────────
export async function loginPacientePassword({ email, password }) {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw new Error('Email o contraseña incorrectos.')

  const perfil = await obtenerPerfil(authData.user.id)
  if (perfil.rol !== 'paciente') {
    await supabase.auth.signOut()
    throw new Error('Esta cuenta no es de paciente.')
  }

  localStorage.setItem('tp_rol', perfil.rol)
  localStorage.setItem('tp_nombre', `${perfil.nombre} ${perfil.apellido}`)
  return perfil
}

// ─── LOGIN PACIENTE CON OTP ───────────────────────────────────────
export async function enviarOTP(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // solo pacientes ya registrados
    },
  })
  if (error) throw new Error('No se pudo enviar el código. Verificá tu email.')

  // Guardar email para la pantalla de OTP
  sessionStorage.setItem('tp_otp_email', email)
}

// ─── VERIFICAR OTP ────────────────────────────────────────────────
export async function verificarOTP(token) {
  const email = sessionStorage.getItem('tp_otp_email')
  if (!email) throw new Error('Sesión expirada. Volvé a ingresar tu email.')

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  if (error) throw new Error('Código incorrecto o expirado.')

  const perfil = await obtenerPerfil(data.user.id)
  localStorage.setItem('tp_rol', perfil.rol)
  localStorage.setItem('tp_nombre', `${perfil.nombre} ${perfil.apellido}`)
  sessionStorage.removeItem('tp_otp_email')

  return perfil
}

// ─── RECUPERAR CONTRASEÑA ─────────────────────────────────────────
export async function recuperarPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/screens/restablecer_password.html`,
  })
  if (error) throw new Error('No se pudo enviar el email de recuperación.')
}

// ─── RESTABLECER CONTRASEÑA ───────────────────────────────────────
export async function restablecerPassword(nuevaPassword) {
  const { error } = await supabase.auth.updateUser({ password: nuevaPassword })
  if (error) throw new Error('No se pudo actualizar la contraseña.')
}

// ─── CERRAR SESIÓN ────────────────────────────────────────────────
export async function cerrarSesion() {
  await supabase.auth.signOut()
  localStorage.removeItem('tp_rol')
  localStorage.removeItem('tp_clinica_id')
  localStorage.removeItem('tp_nombre')
  window.location.href = '/login.html'
}

// ─── GUARDIA DE RUTA ──────────────────────────────────────────────
// Lee el rol desde la DB (no localStorage) para evitar manipulación.
// Devuelve el perfil completo o null si no hay sesión válida.
export async function verificarSesion(rolesPermitidos = []) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    window.location.href = '/login.html'
    return null
  }

  // Re-fetch autoritativo desde DB — localStorage puede ser manipulado
  let perfil
  try {
    perfil = await obtenerPerfil(session.user.id)
  } catch {
    await supabase.auth.signOut()
    window.location.href = '/login.html'
    return null
  }

  if (!perfil.activo) {
    await supabase.auth.signOut()
    window.location.href = '/login.html?motivo=suspendido'
    return null
  }

  // Sincronizar localStorage con valores reales desde DB
  localStorage.setItem('tp_rol', perfil.rol)
  localStorage.setItem('tp_clinica_id', perfil.clinica_id ?? '')
  localStorage.setItem('tp_nombre', `${perfil.nombre} ${perfil.apellido}`)

  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(perfil.rol)) {
    const rutaRol = RUTAS[perfil.rol] || '/login.html'
    window.location.href = rutaRol
    return null
  }

  return perfil
}

// ─── VERIFICAR ESTADO DE LA CLÍNICA ──────────────────────────────
// Bloquea acceso si la suscripción está vencida o cancelada.
export async function verificarClinicaActiva(clinicaId) {
  if (!clinicaId) return

  const { data: clinica } = await supabase
    .from('clinicas')
    .select('status')
    .eq('id', clinicaId)
    .single()

  if (clinica && !['activa', 'trial'].includes(clinica.status)) {
    window.location.href = '/login.html?motivo=suscripcion_vencida'
  }
}

// ─── HELPERS UI ───────────────────────────────────────────────────
export function mostrarError(mensaje, elementoId = 'error-msg') {
  const el = document.getElementById(elementoId)
  if (!el) return
  el.textContent = mensaje
  el.classList.remove('hidden')
  setTimeout(() => el.classList.add('hidden'), 5000)
}

export function setBotonCargando(boton, cargando) {
  if (cargando) {
    boton.disabled = true
    boton.dataset.textoOriginal = boton.textContent
    boton.innerHTML = '<span class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>'
  } else {
    boton.disabled = false
    boton.textContent = boton.dataset.textoOriginal
  }
}
