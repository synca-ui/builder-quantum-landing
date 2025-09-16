import { useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function LoginDialog() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await signIn(email, password);
    setError(error ?? null);
    if (!error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Login</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Login</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <input className="border p-2 rounded" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <input className="border p-2 rounded" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit">Sign in</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SignupDialog() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await signUp(email, password, { name, role });
    setError(error ?? null);
    if (!error) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Signup</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign up</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <input className="border p-2 rounded" type="text" placeholder="Name (optional)" value={name} onChange={(e)=>setName(e.target.value)} />
          <input className="border p-2 rounded" type="text" placeholder="Role (optional)" value={role} onChange={(e)=>setRole(e.target.value)} />
          <input className="border p-2 rounded" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <input className="border p-2 rounded" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit">Create account</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
