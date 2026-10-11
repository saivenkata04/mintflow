import React from 'react';
import { formatINR } from '../utils.js';

export default function Modals({
  activeModal,
  currentDay,
  activeShock,
  savingsActionData,
  onClose,
  onAddTransaction,
  onAddCommitment,
  onAddGoal,
  onAcceptShock,
  onSavingsAction
}) {
  if (!activeModal) return null;

  return (
    <>
      {/* MODAL: ADD TRANSACTION */}
      {activeModal === 'tx' && (
        <div className="modal-overlay active" role="dialog" aria-modal="true" data-testid="modal-transaction">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Log New Transaction</h3>
              <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
            </div>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                onAddTransaction({
                  title: fd.get('title'),
                  amount: Number(fd.get('amount')),
                  day: Number(fd.get('day')),
                  type: fd.get('type'),
                  category: fd.get('category'),
                  note: fd.get('note')
                });
              }}
            >
              <div className="form-group">
                <label htmlFor="tx-m-t">Title</label>
                <input id="tx-m-t" name="title" placeholder="e.g. Chai & Samosa" required />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="tx-m-a">Amount (₹)</label>
                  <input id="tx-m-a" name="amount" type="number" min={1} placeholder="250" required />
                </div>
                <div className="form-group">
                  <label htmlFor="tx-m-d">Day Occurred</label>
                  <input id="tx-m-d" name="day" type="number" min={1} max={30} defaultValue={currentDay} required />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="tx-m-ty">Type</label>
                  <select id="tx-m-ty" name="type">
                    <option value="expense">Expense 💸</option>
                    <option value="income">Income 💰</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="tx-m-c">Category</label>
                  <select id="tx-m-c" name="category">
                    <option value="food">Food & Drinks 🍕</option>
                    <option value="transit">Metro & Cabs 🚕</option>
                    <option value="social">Hangouts & Parties 🪩</option>
                    <option value="bills">Bills & Utilities ⚡</option>
                    <option value="lifestyle">Shopping & Drip 👟</option>
                    <option value="essentials">Academics & Essentials 📚</option>
                    <option value="misc">Miscellaneous ✨</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="tx-m-n">Note (Optional)</label>
                <input id="tx-m-n" name="note" placeholder="Quick comment" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary-mint">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD COMMITMENT */}
      {activeModal === 'com' && (
        <div className="modal-overlay active" role="dialog" aria-modal="true" data-testid="modal-commitment">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Add Recurring Bill or Subscription</h3>
              <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
            </div>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                onAddCommitment({
                  title: fd.get('title'),
                  amount: Number(fd.get('amount')),
                  dueDay: Number(fd.get('dueDay')),
                  category: fd.get('category'),
                  autoPay: fd.get('autoPay') === 'on'
                });
              }}
            >
              <div className="form-group">
                <label htmlFor="c-m-t">Bill Name</label>
                <input id="c-m-t" name="title" placeholder="e.g. YouTube Premium" required />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="c-m-a">Amount (₹)</label>
                  <input id="c-m-a" name="amount" type="number" min={1} placeholder="79" required />
                </div>
                <div className="form-group">
                  <label htmlFor="c-m-d">Due on Day (1-30)</label>
                  <input id="c-m-d" name="dueDay" type="number" min={1} max={30} defaultValue={15} required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="c-m-cat">Category</label>
                <select id="c-m-cat" name="category">
                  <option value="subscriptions">Subscriptions 🔄</option>
                  <option value="bills">Hostel / Utility Bills ⚡</option>
                  <option value="lifestyle">Gym / Wellness 🏋️</option>
                </select>
              </div>
              <div className="form-checkbox">
                <label><input type="checkbox" name="autoPay" defaultChecked /> Auto-deduct when timeline reaches this day</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary-mint">Add Commitment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SAVINGS GOAL */}
      {activeModal === 'goal' && (
        <div className="modal-overlay active" role="dialog" aria-modal="true" data-testid="modal-savings">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Create Savings Target</h3>
              <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
            </div>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                onAddGoal({
                  title: fd.get('title'),
                  targetAmount: Number(fd.get('target')),
                  currentAmount: Number(fd.get('initial') || 0),
                  isLocked: fd.get('locked') === 'on'
                });
              }}
            >
              <div className="form-group">
                <label htmlFor="g-m-t">Goal Name</label>
                <input id="g-m-t" name="title" placeholder="e.g. Goa Trip Stash 🌴" required />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="g-m-tgt">Target Amount (₹)</label>
                  <input id="g-m-tgt" name="target" type="number" min={100} placeholder="2000" required />
                </div>
                <div className="form-group">
                  <label htmlFor="g-m-ini">Initial Deposit (₹)</label>
                  <input id="g-m-ini" name="initial" type="number" min={0} defaultValue={0} />
                </div>
              </div>
              <div className="form-checkbox">
                <label><input type="checkbox" name="locked" defaultChecked /> Lock Shield (prevents accidental impulse withdrawals)</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary-mint">Create Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIFE SHOCK */}
      {activeModal === 'shock' && activeShock && (
        <div className="modal-overlay active" role="dialog" aria-modal="true" data-testid="modal-life-event">
          <div className="modal-dialog shock-modal-dialog">
            <div className="shock-badge-header">{activeShock.tag.toUpperCase()}</div>
            <div className="shock-emoji">{activeShock.type === 'income' ? '🎉' : '💥'}</div>
            <h3 className="shock-title">{activeShock.title}</h3>
            <p className="shock-desc">{activeShock.description}</p>
            <div className="shock-impact-box">
              <span className="impact-label">Immediate Impact:</span>
              <strong className={`impact-amount ${activeShock.type}`}>
                {activeShock.type === 'income' ? '+' : '-'}₹{formatINR(activeShock.amount)}
              </strong>
            </div>
            <div className="modal-actions shock-actions">
              <button type="button" className="btn btn-primary-mint btn-lg w-full" onClick={onAcceptShock} data-testid="accept-shock-btn">
                Face Reality & Apply to Budget ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEPOSIT / WITHDRAW */}
      {activeModal === 'savingsAction' && savingsActionData.goal && (
        <div className="modal-overlay active" role="dialog" aria-modal="true" data-testid="modal-savings-action">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">{savingsActionData.type === 'deposit' ? `Deposit into ${savingsActionData.goal.title}` : `Withdraw from ${savingsActionData.goal.title}`}</h3>
              <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
            </div>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                onSavingsAction(savingsActionData.goal.id, savingsActionData.type, Number(fd.get('amount')));
              }}
            >
              <div className="form-group">
                <label htmlFor="s-act-a">Amount (₹)</label>
                <input id="s-act-a" name="amount" type="number" min={10} max={savingsActionData.type === 'withdraw' ? savingsActionData.goal.currentAmount : 50000} defaultValue={savingsActionData.amount} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary-mint">Confirm {savingsActionData.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
