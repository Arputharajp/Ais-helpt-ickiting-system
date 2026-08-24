import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const Settings = () => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    signature: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['mailbox'],
    queryFn: async () => {
      const res = await axios.get('/mailboxes');
      return res.data;
    },
  });
  
  const mailbox = config?.mailbox;
  const signature = config?.signature || '';

  useEffect(() => {
    if (mailbox) {
       setFormData({ 
           ...mailbox, 
           password: '', 
           signature: signature 
       });
    } else {
        setFormData(prev => ({...prev, signature: signature}));
    }
  }, [mailbox, signature]);

  const saveMutation = useMutation({
     mutationFn: async (data: typeof formData) => {
        await axios.post('/mailboxes', data);
     },
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['mailbox'] });
        alert('Configuration saved successfully!');
     },
     onError: (error: any) => {
        alert(error.response?.data?.message || 'Failed to save configuration.');
     }
  });

  const testMutation = useMutation({
     mutationFn: async (data: typeof formData) => {
        await axios.post('/mailboxes/test', data);
     },
     onSuccess: () => {
        alert('✓ Connection successful\nIMAP and SMTP are working correctly.');
     },
     onError: (error: any) => {
        alert(error.response?.data?.message || 'Authentication failed. Check your App Password.');
     }
  });
  
  const syncMutation = useMutation({
     mutationFn: async () => {
        await axios.post('/mailboxes/sync');
     },
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['mailbox'] });
        alert('Sync completed!');
     },
     onError: (error: any) => {
        alert(error.response?.data?.message || 'Sync failed.');
     }
  });

  const disableMutation = useMutation({
     mutationFn: async () => {
        await axios.post('/mailboxes/disable');
     },
     onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['mailbox'] });
     }
  });

  if (isLoading) return <div className="p-8 text-center">Loading settings...</div>;

  const isConfigured = mailbox?.isConfigured;

  return (
    <div className="max-w-4xl pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your organization's configuration and integrations.</p>
      </div>

      <div className="bg-surface rounded-xl border shadow-sm p-6 mb-6">
         <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div>
               <h2 className="text-xl font-bold">Support Mailbox Integration</h2>
               <p className="text-sm text-muted-foreground mt-1">
                 Connect your Gmail account to automatically turn customer emails into support tickets and send ticket replies from your support mailbox.
               </p>
            </div>
            {mailbox && (
               <div className="flex items-center gap-2">
                  {mailbox.status === 'CONNECTED' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {mailbox.status === 'ERROR' && <AlertCircle className="w-5 h-5 text-destructive" />}
                  {mailbox.status === 'DISABLED' && <XCircle className="w-5 h-5 text-gray-500" />}
                  <span className={`font-medium ${mailbox.status === 'CONNECTED' ? 'text-green-600' : mailbox.status === 'ERROR' ? 'text-destructive' : 'text-gray-600'}`}>
                     {mailbox.status === 'CONNECTED' ? 'Connected' : mailbox.status === 'ERROR' ? 'Connection Error' : 'Disabled'}
                  </span>
               </div>
            )}
         </div>

         <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium mb-1">Gmail Address</label>
                  <input 
                     type="email" 
                     className="w-full border rounded-md px-3 py-2 focus:ring-1 focus:ring-primary-500"
                     value={formData.email}
                     placeholder="support@company.com"
                     onChange={e => setFormData({...formData, email: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">App Password</label>
                  <div className="relative">
                     <input 
                        type={showPassword ? 'text' : 'password'} 
                        className="w-full border rounded-md px-3 py-2 pr-10 focus:ring-1 focus:ring-primary-500 font-mono"
                        value={formData.password}
                        placeholder={isConfigured ? '•••••••••••••••• (Set)' : '16-digit App Password'}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                     />
                     <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                     </button>
                  </div>
                  <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-2 inline-block">
                     How to create a Google App Password
                  </a>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                   <h3 className="text-sm font-medium text-muted-foreground mb-3">IMAP Configuration</h3>
                   <div className="flex gap-2">
                       <input type="text" className="flex-1 border rounded-md px-3 py-2 bg-muted/50" value={formData.imapHost} readOnly />
                       <input type="number" className="w-24 border rounded-md px-3 py-2 bg-muted/50" value={formData.imapPort} readOnly />
                   </div>
                </div>
                <div>
                   <h3 className="text-sm font-medium text-muted-foreground mb-3">SMTP Configuration</h3>
                   <div className="flex gap-2">
                       <input type="text" className="flex-1 border rounded-md px-3 py-2 bg-muted/50" value={formData.smtpHost} readOnly />
                       <input type="number" className="w-24 border rounded-md px-3 py-2 bg-muted/50" value={formData.smtpPort} readOnly />
                   </div>
                </div>
            </div>
            
            <div className="pt-2">
               <label className="block text-sm font-medium mb-1">Email Signature</label>
               <textarea 
                  className="w-full border rounded-md px-3 py-2 focus:ring-1 focus:ring-primary-500 min-h-[100px] font-mono text-sm"
                  value={formData.signature}
                  placeholder="Regards,&#10;{{agent_name}}&#10;{{organization_name}} Support"
                  onChange={e => setFormData({...formData, signature: e.target.value})}
               />
               <p className="text-xs text-muted-foreground mt-1">
                  Variables available: {'{{agent_name}}'}, {'{{organization_name}}'}
               </p>
            </div>
         </div>

         <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <button 
               onClick={() => testMutation.mutate(formData)} 
               disabled={(!isConfigured && (!formData.email || !formData.password)) || testMutation.isPending}
               className="px-4 py-2 border rounded-md hover:bg-muted font-medium transition-colors disabled:opacity-50"
            >
               {testMutation.isPending ? 'Testing...' : 'Test Connection'}
            </button>

            <div className="flex gap-3">
               {mailbox?.isActive && (
                  <button 
                     onClick={() => disableMutation.mutate()} 
                     className="px-4 py-2 text-destructive border border-destructive/30 rounded-md hover:bg-destructive/5 font-medium"
                  >
                     Disable
                  </button>
               )}
               <button 
                  onClick={() => saveMutation.mutate(formData)} 
                  disabled={(!isConfigured && (!formData.email || !formData.password)) || saveMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 font-medium"
               >
                  Save Configuration
               </button>
            </div>
         </div>
      </div>

      {isConfigured && (
         <div className="bg-surface rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold">Mailbox Activity</h3>
               <button 
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="flex items-center gap-2 px-3 py-1.5 border rounded-md hover:bg-muted font-medium text-sm disabled:opacity-50"
               >
                  <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync Now
               </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div>
                   <div className="text-sm text-muted-foreground">Last sync</div>
                   <div className="text-lg font-medium">{mailbox.lastSyncAt ? new Date(mailbox.lastSyncAt).toLocaleTimeString() : 'Never'}</div>
                </div>
                <div>
                   <div className="text-sm text-muted-foreground">Emails processed</div>
                   <div className="text-lg font-medium">{mailbox.emailsProcessed || 0}</div>
                </div>
                <div>
                   <div className="text-sm text-muted-foreground">Tickets created</div>
                   <div className="text-lg font-medium">{mailbox.ticketsCreated || 0}</div>
                </div>
                <div>
                   <div className="text-sm text-muted-foreground">Replies processed</div>
                   <div className="text-lg font-medium">{mailbox.repliesProcessed || 0}</div>
                </div>
            </div>
            
            <div className="border-t pt-4 flex gap-2">
               <span className="text-sm text-muted-foreground">Last error:</span>
               <span className={`text-sm ${mailbox.lastError ? 'text-destructive font-medium' : 'text-foreground'}`}>
                  {mailbox.lastError || 'None'}
               </span>
            </div>
         </div>
      )}
    </div>
  );
};
