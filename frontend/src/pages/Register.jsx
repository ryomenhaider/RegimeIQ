import { COLORS, FONTS } from '../utils/constants';
import RegisterForm from '../components/auth/RegisterForm';

export default function Register() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bg,
        padding: '20px'
      }}
    >
      <div style={{ maxWidth: '400px', width: '100%' }}>
        {/* Logo */}
        <h1
          style={{
            textAlign: 'center',
            fontFamily: FONTS.mono,
            fontSize: '24px',
            fontWeight: 'bold',
            color: COLORS.accent,
            marginBottom: '40px'
          }}
        >
          VektorLabs
        </h1>

        {/* Card */}
        <div
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '40px'
          }}
        >
          <h2
            style={{
              textAlign: 'center',
              fontFamily: FONTS.mono,
              fontSize: '18px',
              color: COLORS.text,
              marginBottom: '32px',
              margin: 0
            }}
          >
            Create your account
          </h2>

          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
