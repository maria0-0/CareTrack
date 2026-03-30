import React from 'react';

const DayViewLoader = ({ 
  selectedDay, 
  user, 
  setAppointmentDate, 
  setIsSchedulingModalOpen, 
  checkAvailability, 
  unavailableTimes, 
  loading,
  currentAppointmentToEdit, 
  handleReschedule,
}) => {    

  const generateTimeSlots = (day) => {
    if (!day) return [];
    
    const slots = [];
    const start = new Date(day);
    start.setHours(8, 0, 0, 0); 
    const end = new Date(day);
    end.setHours(22, 0, 0, 0); 

    let current = new Date(start);

    while (current <= end) {
        slots.push(new Date(current));
        current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
  };

  const isSlotBooked = (slotTime) => {
      return unavailableTimes.find(appt => new Date(appt.time).getTime() === slotTime.getTime());
  };

  const slots = generateTimeSlots(selectedDay);

  if (loading) {
      return <p>Loading schedule...</p>;
  }

  return (
      <div className="day-schedule-grid">
          {slots.map((slot, index) => {
              const bookedSlot = isSlotBooked(slot);
              const isPast = slot < new Date();
              
              const className = bookedSlot 
                  ? 'slot-booked' 
                  : isPast 
                      ? 'slot-past' 
                      : 'slot-available';

              return (
                  <div 
                      key={index} 
                      className={`time-slot ${className}`}
                      onClick={() => {
                        if (currentAppointmentToEdit) {
                          if (className === 'slot-available') {
                            handleReschedule(slot.toISOString()); 
                          } else {
                            alert("This slot is not available.");
                          }
                      } else {
                          if (className === 'slot-available') {
                            setAppointmentDate(slot); 
                            setIsSchedulingModalOpen(false);
                          } else {
                            alert("This slot is not available.");
                          }
                      }
                      }}
                  >
                      <span className="slot-time">
                          {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {bookedSlot && (
                          <div className="booked-info">
                              <span>{bookedSlot.patient || 'Unknown'}</span>
                              <span className="reason-popup">
                                  Reason: {bookedSlot.reason}
                              </span>
                          </div>
                      )}
                  </div>
              );
          })}
      </div>
  );
};

function SchedulerModal({ 
  selectedDay, 
  setSelectedDay, 
  user, 
  setAppointmentDate, 
  setIsSchedulingModalOpen, 
  showSchedulerModal,
  setShowSchedulerModal,
  currentAppointmentToEdit,
  setCurrentAppointmentToEdit,
  bookedDates,
  navigateMonth,
  checkAvailability,
  unavailableTimes,
  checkingAvailability,
  handleReschedule
}) {

  const generateDayPickerDates = (currentDay) => {
    const dates = [];
    const date = new Date(currentDay);
    date.setDate(date.getDate() - 7); 

    for (let i = 0; i < 40; i++) { 
        dates.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return dates;
  };

  return (
    <div className="scheduling-modal-overlay">
      <div className="scheduling-modal-content">
          <div className="modal-header-nav">
              <div className="month-display">
                  <h3>
                      {currentAppointmentToEdit 
                          ? `Reschedule: ${currentAppointmentToEdit.Patient?.name || 'Appointment'}`
                          : 'Schedule New Appointment'}
                  </h3>
              </div>
              
              <div className="nav-buttons">
                  <button onClick={() => navigateMonth(-1)} className="btn-month-nav">&lt; Prev Month</button>
                  <button onClick={() => navigateMonth(1)} className="btn-month-nav">Next Month &gt;</button>
              </div>
              
              <button 
                  onClick={() => {
                      setIsSchedulingModalOpen(false);
                      setShowSchedulerModal(false); 
                      setCurrentAppointmentToEdit(null); 
                  }} 
                  className="modal-close-btn"
              >
                  &times;
              </button>
          </div>

          <div className="day-picker-container">
              {generateDayPickerDates(selectedDay).map((date, index) => {
                  const isSelected = date.toDateString() === selectedDay.toDateString();
                  const isBooked = bookedDates[date.toISOString().split('T')[0]];
                  
                  return (
                      <div 
                          key={index} 
                          className={`day-picker-item ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''}`}
                          onClick={() => setSelectedDay(date)}
                      >
                          <span className="day-name">
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="day-num">
                              {date.getDate()}
                          </span>
                      </div>
                  );
              })}
          </div>
          
          <div className="agenda-view-container">
              <DayViewLoader 
                  selectedDay={selectedDay}
                  user={user}
                  checkAvailability={checkAvailability}
                  unavailableTimes={unavailableTimes}
                  loading={checkingAvailability}
                  currentAppointmentToEdit={currentAppointmentToEdit}
                  handleReschedule={handleReschedule} 
                  setAppointmentDate={setAppointmentDate}
                  setIsSchedulingModalOpen={setIsSchedulingModalOpen}
                  setShowSchedulerModal={setShowSchedulerModal} 
              />
          </div>
      </div>
    </div>
  );
}

export default SchedulerModal;
