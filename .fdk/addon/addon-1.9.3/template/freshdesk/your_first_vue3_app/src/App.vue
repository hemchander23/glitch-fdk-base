<template >
  <Sidebar :agentName="name" />
</template>

<script>
import Sidebar from "./components/Sidebar.vue";

export default {
  mounted() {
    this.initialize();
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
    initialize() {
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


