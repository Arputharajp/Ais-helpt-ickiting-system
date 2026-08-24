import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export const Tickets = () => {
  const [filter, setFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', customerId: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', filter],
    queryFn: async () => {
      const params = filter !== 'ALL' ? { status: filter } : {};
      const res = await axios.get('/tickets', { params });
      return res.data.tickets;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await axios.get('/customers');
      return res.data.customers;
    }
  });

  const createMutation = useMutation({
     mutationFn: async () => {
        await axios.post('/tickets', newTicket);
     },
     onSuccess: () => {
        setIsModalOpen(false);
        setNewTicket({ subject: '', description: '', customerId: '' });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
     }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors">
          New Ticket
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-surface p-6 rounded-xl w-full max-w-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">Create New Ticket</h2>
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">Customer</label>
                    <select 
                       className="w-full border rounded-md px-3 py-2"
                       value={newTicket.customerId}
                       onChange={e => setNewTicket({...newTicket, customerId: e.target.value})}
                    >
                       <option value="">Select a customer...</option>
                       {customers?.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                       ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <input 
                       type="text" 
                       className="w-full border rounded-md px-3 py-2"
                       value={newTicket.subject}
                       onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea 
                       rows={4}
                       className="w-full border rounded-md px-3 py-2"
                       value={newTicket.description}
                       onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                    />
                 </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                 <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                 <button 
                    onClick={() => createMutation.mutate()} 
                    disabled={!newTicket.subject || !newTicket.description || !newTicket.customerId || createMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                 >
                    Create
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border shadow-sm">
        <div className="p-4 border-b flex gap-4">
           <input 
             type="text" 
             placeholder="Search tickets..." 
             className="flex-1 max-w-sm px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
           />
           <select 
             className="border rounded-md px-3 py-2"
             value={filter}
             onChange={e => setFilter(e.target.value)}
           >
             <option value="ALL">All Statuses</option>
             <option value="NEW">New</option>
             <option value="OPEN">Open</option>
             <option value="PENDING">Pending</option>
             <option value="RESOLVED">Resolved</option>
             <option value="CLOSED">Closed</option>
           </select>
        </div>
        
        {isLoading ? (
           <div className="p-8 text-center text-muted-foreground">Loading tickets...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-muted-foreground">ID / Subject</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.length === 0 ? (
                 <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">No tickets found</td>
                 </tr>
              ) : (
                data?.map((ticket: any) => (
                  <tr key={ticket.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/app/tickets/${ticket.id}`} className="font-medium text-primary-600 hover:underline">
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-secondary rounded-md text-xs font-medium">
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 border rounded-md text-xs font-medium">
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-sm">
                          <div>{ticket.customer?.firstName} {ticket.customer?.lastName}</div>
                          <div className="text-muted-foreground text-xs">{ticket.customer?.email}</div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                       {format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
