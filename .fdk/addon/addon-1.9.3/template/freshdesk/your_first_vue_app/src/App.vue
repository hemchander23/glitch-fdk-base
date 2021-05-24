<template >
  <div>
    <Sidebar :agentName="name" />
  </div>
</template>

<script>
import Sidebar from "./components/Sidebar.vue";

export default {
  mounted() {
    this.get();
  },
  name: "App",
  components: {
    Sidebar,
  },
  data() {
    return {
      name: "",
    };
  },
  methods: {
    get() {
      app.initialized().then((client) => {
        client.data.get("contact").then(
          (data) => {
            this.name = data.contact.name;
          },
          (error) => {
            console.error("error", error);
          }
        );
      });
    },
  },
};
</script>

<style scoped>
</style>


