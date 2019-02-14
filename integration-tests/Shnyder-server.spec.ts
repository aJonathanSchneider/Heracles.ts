import HydraClient from "../src/HydraClient";
import HydraClientFactory from "../src/HydraClientFactory";
import { run } from "../testing/AsyncHelper";
import HydraResourceMatcher from "../testing/HydraResourceMatcher";

describe("Having a Hydra client, API documentation and entrypoint", () => {
  beforeEach(
    run(async () => {
      jasmine.addMatchers({ toBeLike: () => new HydraResourceMatcher() });
      this.url = "http://localhost:3001";
      const factory: HydraClientFactory = new HydraClientFactory();
      this.client = factory.withDefaults().andCreate() as HydraClient;
      const serverURLMap: Map<string, string> = new Map();
      serverURLMap.set("http://shnyder.com", "http://localhost:3001");

      this.client.getResource = async (urlOrResource) => {
        // START getUrl
        let url: any = urlOrResource;
        if (typeof url === "object") {
          url = !!url.target ? url.target.iri : url.iri;
        }
        if (!!!url) {
          throw new Error(HydraClient.noUrlProvided);
        }
        // END getUrl
        serverURLMap.forEach((val, key) => {
          if ((url as string).startsWith(key)) {
            url = (url as string).replace(key, val);
          }
        });
        const response = await fetch(url);
        if (response.status !== 200) {
          throw new Error(HydraClient.invalidResponse + response.status);
        }
        const hypermediaProcessor = this.client.getHypermediaProcessor(response);
        if (!hypermediaProcessor) {
          throw new Error(HydraClient.responseFormatNotSupported);
        }
        const result = await hypermediaProcessor.process(response, this.client);
        Object.defineProperty(result, "iri", {
          value: response.url
        });
        return result;
      };
      this.apiDocumentation = await this.client.getApiDocumentation(this.url);
      const entryPoint = await this.apiDocumentation.getEntryPoint();
      this.entryPoint = entryPoint;
    }));

  describe("while accessing the entry point", () => {
    it("hypermedia should be in server-domain", () => {
      expect(this.entryPoint.hypermedia.iri.startsWith("http://shnyder.com")).toBeTruthy();
    });
  });
  describe("two collections are in supportedProperties", () => {
    it("should be a sub-type of OfferInfoCollection or ProductInfoCollection", () => {
      const firstCollection = this.entryPoint.hypermedia.collections.first();
      expect(
        (firstCollection.type.contains("http://shnyder.com/api/ysj/hydra/ProductInfoCollection"))
        || (firstCollection.type.contains("http://shnyder.com/api/ysj/hydra/OfferInfoCollection"))
      ).toBeTruthy();
    });
  });
  describe("two collections are in supportedProperties", () => {
    it("should return the @id from their domain", () => {
      const firstCollection = this.entryPoint.hypermedia.collections.first();
      expect(
        (firstCollection.iri === "http://shnyder.com/api/ysj/hydra/offerinfos")
        || (firstCollection.iri === "http://shnyder.com/api/ysj/hydra/productinfos")
      ).toBeTruthy();
    });
  });
});
