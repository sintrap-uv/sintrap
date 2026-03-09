  import "expo-router/entry";
  import {supabase } from './services/supabase';
  import { useEffect } from 'react';

  export default function App() {
     // Escuchar cambios en la autenticación
  const checkSession = async () => {
    const {data}= await supabase.auth.getSession()
    if (data.session) {
      console.log('Usuario autenticado:', data.session.user.email)
    } else {
      console.log('No hay usuario autenticado')
    }
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('Usuario ha iniciado sesión:', session.user.email)
    } else if (event === 'SIGNED_OUT') {
      console.log('Usuario ha cerrado sesión')
    }
  })


    useEffect(() => {
      checkSession()
    }, [])  }
