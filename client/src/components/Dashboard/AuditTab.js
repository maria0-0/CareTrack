import React, { useState, useEffect, useCallback } from 'react';
import API_URL from '../../apiConfig';

function AuditTab({ user }) {
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchAuditLogs = useCallback(async () => {
    if (!user || !user.token) return;
    try {
      const res = await fetch(`${API_URL}/audit-logs`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div className="audit-container">
      <h3>Istoric Securitate</h3>
      <table className="audit-table">
        <thead>
          <tr>
            <th>Dată</th>
            <th>Doctor</th>
            <th>Acțiune</th>
            <th>Detalii</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map(log => (
            <tr key={log.id} className="audit-row">
              <td className="audit-date">{new Date(log.createdAt).toLocaleString()}</td>
              <td className="audit-user">
                {log.User ? `${log.User.firstName} ${log.User.lastName}` : 'Sistem'}
              </td>
              <td className="audit-action">
                <span className={`badge action-${(log.action || '').toLowerCase()}`}>
                  {log.action}
                </span>
              </td>
              <td className="audit-details">{log.details}</td>
              <td className="audit-ip"><code>{log.ipAddress}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AuditTab;
