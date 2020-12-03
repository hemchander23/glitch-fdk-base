function initializeCalendar() {
  var calendarEl = document.getElementById('calendar');
  window.calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    slotDuration: '01:00:00',
    expandRows: true,
    height: '100%',
    selectable: true,
    businessHours: {
      startTime: '06:00',
      endTime: '19:00',
    },
    headerToolbar: {
      left: 'prev,today,next',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: function (info, successCallback) {
      loadAppointments(successCallback);
    },
    select: function (date) {
      newAppointment(date);
    },
    eventClick: function (info) {
      var tUrl = info.event.extendedProps.ticketUrl;
      if (tUrl) {
        window.open(tUrl, "_blank");
        return false;
      }
    }
  });
  calendar.render();
}

function newAppointment(date) {
  client.interface.trigger("showModal", {
    title: "Add Appointment",
    template: "./modal/appointment.html",
    data: {
      startAt: date.startStr,
      endAt: date.endStr
    }
  }).catch(function (error) {
    console.log(error);
  });
}

function createCalendarEventObj(i, iparam) {
  return {
    id: i.display_id,
    title: i.data.restaurant_info + " - " + i.data.notes,
    start: new Date(Date.parse(i.data.appointment_date)).toISOString().split(".")[0],
    backgroundColor: hashCode(i.data.restaurant_info),
    extendedProps: {
      ticketUrl: iparam.$domain.url + "/a/tickets/" + i.data.ticket_id
    }
  }
}