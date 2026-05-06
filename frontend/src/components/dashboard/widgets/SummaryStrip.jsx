import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

export default function SummaryStrip() {
  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.card }}>
      <h3 className="text-sm font-semibold" style={{ color: COLORS.text }}>
        SummaryStrip
      </h3>
    </div>
  );
}
