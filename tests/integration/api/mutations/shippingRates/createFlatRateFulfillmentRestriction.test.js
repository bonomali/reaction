import encodeOpaqueId from "@reactioncommerce/api-utils/encodeOpaqueId.js";
import importAsString from "@reactioncommerce/api-utils/importAsString.js";
import Factory from "/tests/util/factory.js";
import TestApp from "/tests/util/TestApp.js";

const CreateFlatRateFulfillmentRestrictionMutation = importAsString("./CreateFlatRateFulfillmentRestrictionMutation.graphql");

jest.setTimeout(300000);

const internalShopId = "123";
const opaqueShopId = encodeOpaqueId("reaction/shop", internalShopId); // reaction/shop:123
const shopName = "Test Shop";
let createFlatRateFulfillmentRestriction;
let testApp;

const mockFulfillmentRestrictionInput = {
  methodIds: [],
  type: "allow",
  destination: {
    country: ["US"],
    postal: ["90817"],
    region: ["CA"]
  },
  attributes: [
    { property: "vendor", value: "reaction", propertyType: "string", operator: "eq" },
    { property: "productType", value: "knife", propertyType: "string", operator: "eq" }
  ]
};

const adminGroup = Factory.Group.makeOne({
  _id: "adminGroup",
  createdBy: null,
  name: "admin",
  permissions: ["reaction:legacy:shippingRestrictions/create"],
  slug: "admin",
  shopId: internalShopId
});

const mockOwnerAccount = Factory.Account.makeOne({
  groups: [adminGroup._id],
  shopId: internalShopId
});

beforeAll(async () => {
  testApp = new TestApp();
  await testApp.start();

  await testApp.insertPrimaryShop({ _id: internalShopId, name: shopName });
  await testApp.collections.Groups.insertOne(adminGroup);
  await testApp.createUserAndAccount(mockOwnerAccount);
  createFlatRateFulfillmentRestriction = testApp.mutate(CreateFlatRateFulfillmentRestrictionMutation);
});

// There is no need to delete any test data from collections because
// testApp.stop() will drop the entire test database. Each integration
// test file gets its own test database.
afterAll(() => testApp.stop());

afterEach(async () => {
  await testApp.clearLoggedInUser();
});

test("shop owner cannot update flat rate fulfillment restriction if not logged in", async () => {
  try {
    await createFlatRateFulfillmentRestriction({
      input: {
        shopId: opaqueShopId,
        restriction: mockFulfillmentRestrictionInput
      }
    });
  } catch (error) {
    expect(error).toMatchSnapshot();
  }
});

test("user with `reaction:legacy:shippingMethods/create` permissions can update flat rate fulfillment restriction", async () => {
  let result;
  await testApp.setLoggedInUser(mockOwnerAccount);

  try {
    result = await createFlatRateFulfillmentRestriction({
      input: {
        shopId: opaqueShopId,
        restriction: mockFulfillmentRestrictionInput
      }
    });
  } catch (error) {
    expect(error).toBeUndefined();
    return;
  }

  expect(result.createFlatRateFulfillmentRestriction.restriction).toMatchObject({
    _id: expect.any(String),
    shopId: opaqueShopId,
    ...mockFulfillmentRestrictionInput
  });
});
