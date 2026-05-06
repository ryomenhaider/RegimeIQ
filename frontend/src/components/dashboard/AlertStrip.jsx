import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

export default function AlertStrip() {
  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.cardAlt }}>
      <h3 className="text-sm font-semibold" style={{ color: COLORS.warn }}>
        AlertStrip
      </h3>
    </div>
  );
}
