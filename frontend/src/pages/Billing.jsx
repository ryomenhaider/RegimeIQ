import clsx from 'clsx';
import { COLORS } from '../utils/constants';

export default function Billing() {
  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: COLORS.bg }}>
      <h1 className="text-4xl font-bold" style={{ color: COLORS.accent }}>
        Billing
      </h1>
    </div>
  );
}
