import { useState, useEffect } from 'react';

export function useRealtimeDuplicateCheck(email, phone) {
  const [emailStatus, setEmailStatus] = useState(null); // null, 'available', 'duplicate', 'checking'
  const [phoneStatus, setPhoneStatus] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  // Debounce para email
  useEffect(() => {
    if (!email) {
      setEmailStatus(null);
      return;
    }

    // Validar formato básico de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus(null);
      return;
    }

    setCheckingEmail(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone: null }),
        });
        
        const data = await response.json();
        setEmailStatus(data.checks?.email?.exists ? 'duplicate' : 'available');
      } catch (error) {
        setEmailStatus(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [email]);

  // Debounce para telefone
  useEffect(() => {
    if (!phone) {
      setPhoneStatus(null);
      return;
    }

    // Validar formato básico de telefone (11 dígitos: DDD + número)
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length !== 11) {
      setPhoneStatus(null);
      return;
    }

    setCheckingPhone(true);
    const timer = setTimeout(async () => {
      try {
        // Enviar número formatado para API normalizar
        const response = await fetch('/api/auth/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: null, phone }),
        });
        
        const data = await response.json();
        setPhoneStatus(data.checks?.phone?.exists ? 'duplicate' : 'available');
      } catch (error) {
        setPhoneStatus(null);
      } finally {
        setCheckingPhone(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [phone]);

  return {
    emailStatus,
    phoneStatus,
    checkingEmail,
    checkingPhone,
    hasEmailDuplicate: emailStatus === 'duplicate',
    hasPhoneDuplicate: phoneStatus === 'duplicate',
  };
}

