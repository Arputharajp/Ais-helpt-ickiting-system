import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

export const Customers = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ firstName: '', lastName: '', email: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await axios.get('/customers');
      return res.data.customers;
    },
  });

  const createMutation = useMutation({
     mutationFn: async () => {
        await axios.post('/customers', newCustomer);
     },
     onSuccess: () => {
        setIsModalOpen(false);
        setNewCustomer({ firstName: '', lastName: '', email: '' });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
     },
     onError: (error: any) => {
        alert(error.response?.data?.message || 'Failed to create customer');
     }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors">
          Add Customer
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-surface p-6 rounded-xl w-full max-w-md shadow-lg">
              <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">First Name</label>
                    <input 
                       type="text" 
                       className="w-full border rounded-md px-3 py-2"
                       value={newCustomer.firstName}
                       onChange={e => setNewCustomer({...newCustomer, firstName: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <input 
                       type="text" 
                       className="w-full border rounded-md px-3 py-2"
                       value={newCustomer.lastName}
                       onChange={e => setNewCustomer({...newCustomer, lastName: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input 
                       type="email" 
                       className="w-full border rounded-md px-3 py-2"
                       value={newCustomer.email}
                       onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                    />
                 </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                 <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                 <button 
                    onClick={() => createMutation.mutate()} 
                    disabled={!newCustomer.firstName || !newCustomer.lastName || !newCustomer.email || createMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                 >
                    Create
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border shadow-sm">
        {isLoading ? (
           <div className="p-8 text-center text-muted-foreground">Loading customers...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Added On</th>
              </tr>
            </thead>
            <tbody>
              {data?.length === 0 ? (
                 <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">No customers found</td>
                 </tr>
              ) : (
                data?.map((customer: any) => (
                  <tr key={customer.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                             {customer.firstName?.[0]}
                          </div>
                          <span className="font-medium">{customer.firstName} {customer.lastName}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">{customer.email}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                       {new Date(customer.createdAt).toLocaleDateString()}
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
