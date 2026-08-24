export const Dashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Tickets', value: '0' },
          { label: 'Open Tickets', value: '0' },
          { label: 'Unassigned', value: '0' },
          { label: 'SLA Breached', value: '0' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface p-6 rounded-xl border shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface p-6 rounded-xl border shadow-sm h-96 flex items-center justify-center">
         <p className="text-muted-foreground">Analytics charts will appear here (Phase 6)</p>
      </div>
    </div>
  );
};
