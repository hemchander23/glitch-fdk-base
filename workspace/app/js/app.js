document.addEventListener('DOMContentLoaded', function () {
  initializeCalendar();
  app.initialized().then(function (client) {
    window.client = client;
    window.restaurant = getEntity("restaurants");
    window.appointment = getEntity("appointments");
    manageInstanceInteractions();
    updateView();
  });
});

function newRestaurant() {
  client.interface.trigger("showModal", {
      title: "Add Restaurant",
      template: "./modal/restaurant.html"
    })
    .catch(function (error) {
      notify("danger", "Something went wrong while opening the restaurant modal")
      console.error(error);
    });
}

function getEntity(entityName) {
  var entity = client.db.entity({
    version: 'v1'
  });
  return entity.get(entityName);
}

function loadRestaurants() {
  restaurant.getAll()
    .then(function (data) {
      $("#restaurant_list").html(generateRestaurantList(data.records));
    })
    .catch(function (error) {
      notify("danger", "Something went wrong while loading the restaurants")
      console.error(error);
    })
}

function loadAppointments(callback) {
  if (typeof appointment !== 'undefined') {
    client.iparams.get()
      .then(function (iparam) {
        appointment.getAll()
          .then(function (data) {
            var events = data.records.map(function (i) {
              return createCalendarEventObj(i, iparam);
            });
            callback(events);
          })
          .catch(function (error) {
            console.error(error);
          })
      })
      .catch(function (error) {
        console.error(error);
      })

  }
}

function generateRestaurantList(records) {
  return records.map(function (i) {
    return `<li class="list-group-item">
            <div class="row">
              <div class="col-sm-3">
                <img src='${i.data.photo_url ? i.data.photo_url: "https://i.imgur.com/ZyONF7N.png" }' style='min-width: 100px;' width="100px" height="100px" />
              </div>
              <div class="col-sm-6 ml-2" style='min-width: 350px;' >
                <h4>${i.data.name}</h4>
                <b> ${i.display_id}</b>
                <p>${i.data.description} ...</p>
                <a href="#">
                    <fw-label value="${ catalogStatus(i.data.status).status }" color="${ catalogStatus(i.data.status).color }"></fw-label>
                    <fw-button size="mini" style="display:${ i.data.status == '1' ? 'inline': 'none' }" color="secondary" onclick='deleteRestaurant("${i.display_id}","${ escape(i.data.name) }")'> Delete </fw-button>
                </a>
              </div>
              <div class="col-sm-3">

              </div>
            </div>
            </li>`
  }).join("");
}

function filterRestaurants() {
  var status = document.getElementById("catalog_in").value;
  var qs = {},
    getAllRestaurants;

  if (status && status != "0") {
    qs = {
      query: {
        status: String(status)
      }
    };
    getAllRestaurants = restaurant.getAll(qs)
  } else {
    getAllRestaurants = restaurant.getAll();
  }
  getAllRestaurants.then(function (data) {
    $("#restaurant_list").html(generateRestaurantList(data.records));
  });
}

function deleteRestaurant(id, name) {
  client.interface.trigger("showConfirm", {
    title: "Delete " + unescape(name) + " ?",
    message: "Note: You also cannot delete restaurants if they already have appointments",
    saveLabel: "Delete"
  }).then(function (action) {
    if (action.message == "Delete") {
      restaurant.delete(id);
      notify("success", `Restaurant - ${ unescape(name) } deleted successfully`);
      updateView();
    }
  }).catch(function (error) {
    console.error(error);
    client.instance.close();
  });

}