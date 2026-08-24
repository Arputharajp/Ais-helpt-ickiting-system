import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import { useState } from 'react';

export const TicketDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const res = await axios.get(`/tickets/${id}`);
      return res.data.ticket;
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      await axios.post(`/tickets/${id}/messages`, {
        content,
        isInternal,
      });
    },
    onSuccess: () => {
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      await axios.patch(`/tickets/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  if (isLoading) return <div className="p-8 text-center">Loading ticket...</div>;
  if (!ticket) return <div className="p-8 text-center text-destructive">Ticket not found</div>;

  return (
    <div className="flex gap-6 h-full">
      {/* Main Workspace */}
      <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
        {/* Header */}
        <div className="bg-surface p-6 rounded-xl border shadow-sm flex flex-col gap-4 shrink-0">
          <div className="flex justify-between items-start">
             <div>
               <h1 className="text-2xl font-bold">{ticket.subject}</h1>
               <div className="text-sm text-muted-foreground mt-1">
                 #{ticket.id} • Created {format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}
               </div>
             </div>
             
             <div className="flex gap-2 items-center">
                <select 
                   className="border rounded-md px-3 py-1.5 text-sm font-medium bg-secondary"
                   value={ticket.status}
                   onChange={(e) => statusMutation.mutate(e.target.value)}
                >
                   <option value="NEW">New</option>
                   <option value="OPEN">Open</option>
                   <option value="PENDING">Pending</option>
                   <option value="ON_HOLD">On Hold</option>
                   <option value="RESOLVED">Resolved</option>
                   <option value="CLOSED">Closed</option>
                </select>
             </div>
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="bg-surface rounded-xl border shadow-sm flex-1 flex flex-col min-h-0">
           <div className="p-6 border-b flex-1 overflow-y-auto flex flex-col gap-6">
              {/* Original description message */}
              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                    {ticket.customer?.firstName?.[0]}
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                       <span className="font-medium">{ticket.customer?.firstName} {ticket.customer?.lastName}</span>
                       <span className="text-xs text-muted-foreground">{format(new Date(ticket.createdAt), 'MMM d HH:mm')}</span>
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</div>
                 </div>
              </div>

              {/* Messages */}
              {ticket.messages?.map((msg: any) => {
                 const isCustomer = msg.senderType === 'CUSTOMER';
                 const senderInitials = isCustomer 
                    ? ticket.customer?.firstName?.[0] 
                    : msg.user?.firstName?.[0];
                 const senderName = isCustomer 
                    ? `${ticket.customer?.firstName} ${ticket.customer?.lastName}` 
                    : `${msg.user?.firstName} ${msg.user?.lastName}`;

                 return (
                    <div key={msg.id} className={`flex gap-4 ${msg.isInternal ? 'p-4 bg-amber-50 rounded-lg border border-amber-200' : ''}`}>
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${isCustomer ? 'bg-blue-100 text-blue-700' : 'bg-primary-100 text-primary-700'}`}>
                          {senderInitials}
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-baseline mb-1">
                             <div className="flex items-center gap-2">
                                <span className="font-medium">{senderName}</span>
                                {msg.isInternal && <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded">Internal Note</span>}
                             </div>
                             <span className="text-xs text-muted-foreground">{format(new Date(msg.createdAt), 'MMM d HH:mm')}</span>
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</div>
                       </div>
                    </div>
                 )
              })}
           </div>
           
           {/* Reply Composer */}
           <div className="p-4 bg-muted/30">
              <textarea 
                 rows={4}
                 className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface"
                 placeholder={isInternal ? "Write an internal note (customers won't see this)..." : "Type your reply..."}
                 value={replyContent}
                 onChange={e => setReplyContent(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3">
                 <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input 
                       type="checkbox" 
                       checked={isInternal}
                       onChange={e => setIsInternal(e.target.checked)}
                       className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    Add as internal note
                 </label>
                 <button 
                    disabled={!replyContent.trim() || replyMutation.isPending}
                    onClick={() => replyMutation.mutate(replyContent)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                       isInternal 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                    } disabled:opacity-50`}
                 >
                    {isInternal ? 'Add Note' : 'Send Reply'}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 flex flex-col gap-6 shrink-0 h-full overflow-y-auto pb-6">
         {/* Customer Card */}
         <div className="bg-surface p-5 rounded-xl border shadow-sm">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Customer</h3>
            <div className="flex items-center gap-3 mb-4">
               <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                  {ticket.customer?.firstName?.[0]}
               </div>
               <div>
                  <div className="font-medium leading-tight">{ticket.customer?.firstName} {ticket.customer?.lastName}</div>
                  <div className="text-sm text-muted-foreground">{ticket.customer?.email}</div>
               </div>
            </div>
            <button className="w-full text-sm font-medium text-primary-600 hover:bg-primary-50 py-2 rounded transition-colors">
               View Profile
            </button>
         </div>

         {/* Properties Card */}
         <div className="bg-surface p-5 rounded-xl border shadow-sm">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Properties</h3>
            <div className="space-y-4">
               <div>
                  <div className="text-xs text-muted-foreground mb-1">Priority</div>
                  <select 
                     className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                     value={ticket.priority}
                     onChange={(e) => axios.patch(`/tickets/${id}`, { priority: e.target.value }).then(() => queryClient.invalidateQueries({ queryKey: ['ticket', id]}))}
                  >
                     <option value="LOW">Low</option>
                     <option value="MEDIUM">Medium</option>
                     <option value="HIGH">High</option>
                     <option value="URGENT">Urgent</option>
                  </select>
               </div>
               
               <div>
                  <div className="text-xs text-muted-foreground mb-1">Assignee</div>
                  <select 
                     className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                     <option value="">Unassigned</option>
                     {ticket.assignee && (
                        <option value={ticket.assigneeId}>{ticket.assignee.firstName} {ticket.assignee.lastName}</option>
                     )}
                  </select>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
