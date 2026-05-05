import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { CreditCard, History, Zap, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDateTime } from '../utils/format';

const Billing = () => {
  const { user } = useAuth();

  const plans = [
    { name: 'Standard', price: 49, features: ['Real-time Order Flow', 'Market Regime Detection', 'Basic LLM Insights'] },
    { name: 'Professional', price: 149, features: ['Everything in Standard', 'Advanced Causal Insights', 'Custom Alpha Signals', 'Priority API Access'], highlighted: true },
    { name: 'Institutional', price: 499, features: ['Everything in Pro', 'White-glove Support', 'Dedicated Inference Nodes', 'Raw Data Firehose'] },
  ];

  const history = [
    { id: 'INV-001', date: '2024-04-01', amount: 149, status: 'Paid' },
    { id: 'INV-002', date: '2024-03-01', amount: 149, status: 'Paid' },
    { id: 'INV-003', date: '2024-02-01', amount: 49, status: 'Paid' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">BILLING & SUBSCRIPTION</h1>
        <p className="text-text-secondary mt-2">Manage your subscription plan and review your payment history.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`p-8 flex flex-col relative overflow-hidden ${plan.highlighted ? 'border-brand-primary' : ''}`}
          >
            {plan.highlighted && (
              <div className="absolute top-0 right-0 bg-brand-primary text-bg-pure text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
                Recommended
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-text-muted">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-text-secondary">
                  <CheckCircle2 className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>

            {user.plan?.toLowerCase() === plan.name.toLowerCase() ? (
              <Button variant="outline" className="w-full" disabled>Current Plan</Button>
            ) : (
              <Button variant={plan.highlighted ? 'primary' : 'secondary'} className="w-full">
                {plan.price > (plans.find(p => p.name.toLowerCase() === user.plan?.toLowerCase())?.price || 0) ? 'Upgrade' : 'Switch'}
              </Button>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Method */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-bg-card-alt px-6 py-4 border-b border-border flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-brand-primary" />
            <span className="text-sm font-bold text-white uppercase tracking-widest">Payment Method</span>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between p-4 bg-bg-app border border-border rounded-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-bg-card rounded-sm border border-border flex items-center justify-center font-bold italic text-white">
                  VISA
                </div>
                <div>
                  <div className="text-sm font-bold text-white">•••• •••• •••• 4242</div>
                  <div className="text-xs text-text-secondary">Expires 12/26</div>
                </div>
              </div>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          </div>
        </Card>

        {/* Billing History */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-bg-card-alt px-6 py-4 border-b border-border flex items-center gap-3">
            <History className="h-4 w-4 text-brand-primary" />
            <span className="text-sm font-bold text-white uppercase tracking-widest">Billing History</span>
          </div>
          <div className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Invoice</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Date</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-white/5 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-mono text-text-primary">{item.id}</td>
                    <td className="px-6 py-4 text-text-secondary">{item.date}</td>
                    <td className="px-6 py-4 text-text-primary font-bold">${item.amount}</td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant="bullish">Paid</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Billing;
