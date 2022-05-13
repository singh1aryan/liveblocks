import "regenerator-runtime/runtime";

import { LiveList } from "../src/LiveList";
import { prepareTest, prepareTestsConflicts, wait } from "./utils";

describe("LiveList confict resolution", () => {
  test("set + move / move + move", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C"); //  Client1 sets "A" to "C"
      root1.get("list").move(0, 1); //  Client1 moves "C" after "B"
      root2.get("list").move(0, 1); //  Client2 moves "A" after "B"
      root2.get("list").move(0, 1); //  Client2 moves "B" after "A"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "C"] }, { list: ["C", "B"] }); // A(0.3), B(0.4) => C(0.1),B(0.4) => C(0.3),B(0.4)

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B"] });
    });
  });

  test("delete + insert / set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A"]),
      });

    await run(async () => {
      await assert({ list: ["A"] });

      socketUtils.pauseAllSockets();

      root1.get("list").delete(0);
      root1.get("list").insert("B", 0);
      root2.get("list").set(0, "C");

      await await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B"] }, { list: ["B", "C"] });

      await await socketUtils.sendMessagesClient2();

      await assert({ list: ["C"] });
    });
  });

  test("set / delete + insert", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A"]),
      });

    await run(async () => {
      await assert({ list: ["A"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C");
      root2.get("list").delete(0);
      root2.get("list").insert("B", 0);

      await await socketUtils.sendMessagesClient1();

      // await assertEach({ list: ["C"] }, { list: ["C", "B"] }); // 2: B(0.1) => C(0.1)

      await await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "B"] });
      // 1: C(0.1) => C(0.1) B(0.2)
      // 2: C
    });
  });

  test("move + move / move + set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").move(0, 1); //  Client1 moves "A" after "B"
      root1.get("list").move(0, 1); //  Client1 moves "B" after "A"
      root2.get("list").move(0, 1); //  Client2 moves "A" after "B"
      root2.get("list").set(0, "C"); //  Client2 sets "B" to "C"

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["A", "B"] }, { list: ["C", "A"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["C", "A"] });
    });
  });

  test("set + move / move + set", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C");
      root1.get("list").move(0, 1);
      root2.get("list").move(0, 1);
      root2.get("list").set(0, "D");

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B", "C"] }, { list: ["D", "C"] });

      await socketUtils.sendMessagesClient2();

      await assert({ list: ["D", "C"] });
    });
  });

  test.skip("insert + delete / insert", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList([]),
      });

    await run(async () => {
      await assert({ list: [] });

      socketUtils.pauseAllSockets();

      root1.get("list").insert("A", 0);
      root1.get("list").delete(0);
      root2.get("list").insert("B", 0);

      await assertEach({ list: [] }, { list: ["B"] });

      await socketUtils.sendMessagesClient1();
      await wait(2000);

      await assertEach({ list: [] }, { list: ["B"] }); // B(0.1) => A(0.1) B(0.2) => B(0.2)

      await socketUtils.sendMessagesClient2();

      await wait(2000);

      await assert({ list: ["B"] }); // Client 1: B(0,1) // Client 2:  B(0.2)

      // root2.get("list").insert("C", 0); // Client 2: C(0.1) B(0.2)

      // await wait(2000);

      // console.log("after 3");

      // await assertEach({ list: ["B", "C"] }, { list: ["C", "B"] });
    });
  });

  test("set + delete / move + insert", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList(["A", "B"]),
      });

    await run(async () => {
      await assert({ list: ["A", "B"] });

      socketUtils.pauseAllSockets();

      root1.get("list").set(0, "C");
      root1.get("list").delete(0);
      root2.get("list").move(0, 1);
      root2.get("list").insert("D", 0);

      await assertEach({ list: ["B"] }, { list: ["D", "B", "A"] });

      await socketUtils.sendMessagesClient1();

      await assertEach({ list: ["B"] }, { list: ["B"] }); // D(0.1), B(0.2), A(0.3) => D,B =>  C(0.1), D(0.15), B(0.2) => D(0.15), B(0.2)

      await socketUtils.sendMessagesClient2();

      await wait(2000);

      await assert({ list: ["D", "B"] });
    });
  });

  test("push + delete / push", async () => {
    const { root1, root2, assert, assertEach, socketUtils, run } =
      await prepareTest<{
        list: LiveList<string>;
      }>({
        list: new LiveList([]),
      });

    await run(async () => {
      await assert({ list: [] });

      await wait(2000);

      socketUtils.pauseAllSockets();

      root1.get("list").push("A");
      root1.get("list").delete(0);

      root2.get("list").push("B");

      await assertEach({ list: [] }, { list: ["B"] });

      await socketUtils.sendMessagesClient1();

      await wait(2000);

      await assertEach({ list: [] }, { list: ["B"] }); // B(0.2)

      await socketUtils.sendMessagesClient2();
      await wait(2000);

      await assert({ list: ["B"] });

      // B positions are not the same on both clients
    });
  });
});

describe("LiveList conflicts", () => {
  describe("insert conflicts", () => {
    test(
      "remote insert conflicts with another insert",
      prepareTestsConflicts(
        {
          list: new LiveList(),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").push("A");
          root2.get("list").push("B");

          await socketUtils.sendMessagesClient1();

          assert({ list: ["A"] }, { list: ["A", "B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["A", "B"] });
        }
      )
    );

    test.skip(
      "remote insert conflicts with another insert via undo",
      prepareTestsConflicts(
        {
          list: new LiveList(),
        },
        async ({ root1, root2, room2, socketUtils, assert }) => {
          root1.get("list").push("A");
          root2.get("list").push("B");
          root2.get("list").delete(0);
          room2.history.undo();

          assert({ list: ["A"] }, { list: ["B"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["A"] }, { list: ["A", "B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["A", "B"] });
        }
      )
    );

    test(
      "remote insert conflicts with move",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").push("C");
          root2.get("list").move(0, 1);

          assert({ list: ["A", "B", "C"] }, { list: ["B", "A"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["A", "B", "C"] }, { list: ["B", "C", "A"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["B", "C", "A"] });
        }
      )
    );

    test(
      "remote insert conflicts with move via undo",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B"]),
        },
        async ({ root1, root2, room2, socketUtils, assert }) => {
          root1.get("list").push("C");
          root2.get("list").move(0, 1);
          root2.get("list").move(1, 0);
          room2.history.undo();

          assert({ list: ["A", "B", "C"] }, { list: ["B", "A"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["A", "B", "C"] }, { list: ["B", "C", "A"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["B", "C", "A"] });
        }
      )
    );

    test(
      "remote insert conflicts with set",
      prepareTestsConflicts(
        {
          list: new LiveList<string>(),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").push("A");
          root2.get("list").push("B");
          root2.get("list").set(0, "C");

          assert({ list: ["A"] }, { list: ["C"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["A"] }, { list: ["A", "C"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["C"] });
        }
      )
    );
  });

  describe("set conflicts", () => {
    test(
      "remote set conflicts with a set",
      prepareTestsConflicts(
        {
          list: new LiveList(["A"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").set(0, "B");
          root2.get("list").set(0, "C");

          assert({ list: ["B"] }, { list: ["C"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B"] }, { list: ["B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["C"] });
        }
      )
    );

    test.skip(
      "remote set conflicts with a set via undo",
      prepareTestsConflicts(
        {
          list: new LiveList(["A"]),
        },
        async ({ root1, root2, room2, socketUtils, assert }) => {
          root1.get("list").set(0, "B");
          root2.get("list").set(0, "C");
          root2.get("list").set(0, "D");
          room2.history.undo();

          assert({ list: ["B"] }, { list: ["C"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B"] }, { list: ["B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["C"] });
        }
      )
    );

    test(
      "remote set conflicts with an insert",
      prepareTestsConflicts(
        {
          list: new LiveList(["A"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").set(0, "B");
          root2.get("list").delete(0);
          root2.get("list").push("C");

          assert({ list: ["B"] }, { list: ["C"] });

          await socketUtils.sendMessagesClient1();

          console.log("hey");

          assert({ list: ["B"] }, { list: ["B"] });

          await socketUtils.sendMessagesClient2();

          console.log("hoy");

          assert({ list: ["B", "C"] });
        }
      )
    );

    test.skip(
      "remote set conflicts with an insert via undo",
      prepareTestsConflicts(
        {
          list: new LiveList(["A"]),
        },
        async ({ root1, root2, room2, socketUtils, assert }) => {
          root1.get("list").set(0, "B");
          root2.get("list").delete(0);
          room2.history.undo();

          assert({ list: ["B"] }, { list: ["A"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B"] }, { list: ["B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["B", "A"] });
        }
      )
    );

    test(
      "remote set conflicts with move",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B", "C"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").set(0, "D");
          root2.get("list").delete(0);
          root2.get("list").move(1, 0);

          assert({ list: ["D", "B", "C"] }, { list: ["C", "B"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B", "C"] });
        }
      )
    );

    test(
      "remote set conflicts with move via undo",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B", "C"]),
        },
        async ({ root1, root2, room2, socketUtils, assert }) => {
          root1.get("list").set(0, "D");
          root2.get("list").delete(0);
          root2.get("list").move(1, 0);
          root2.get("list").move(0, 1);
          room2.history.undo();

          assert({ list: ["D", "B", "C"] }, { list: ["C", "B"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B", "C"] });
        }
      )
    );

    test(
      "remote set conflicts with delete",
      prepareTestsConflicts(
        {
          list: new LiveList(["A"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").set(0, "B");
          root2.get("list").delete(0);

          assert({ list: ["B"] }, { list: [] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B"] }, { list: ["B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["B"] }, { list: ["B"] });
        }
      )
    );

    test(
      "remote set + move conflicts with set",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").set(0, "C"); //  Client1 sets "A" to "C"
          root1.get("list").move(0, 1); //  Client1 moves "C" after "B"
          root2.get("list").set(0, "D"); //  Client2 sets "A" to "D"

          assert({ list: ["B", "C"] }, { list: ["D", "B"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B", "C"] }, { list: ["B", "C"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["D", "B", "C"] }, { list: ["D", "B", "C"] });
        }
      )
    );

    test(
      "remote set conflicts with set + move",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").set(0, "C");
          root2.get("list").set(0, "D");
          root2.get("list").move(0, 1);

          assert({ list: ["C", "B"] }, { list: ["B", "D"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["C", "B"] }, { list: ["C", "B", "D"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["B", "D"] }, { list: ["B", "D"] });
        }
      )
    );
  });

  describe("move conflicts", () => {
    test(
      "remote move conflicts with move",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B", "C"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").move(0, 2);
          root2.get("list").move(1, 2);

          assert({ list: ["B", "C", "A"] }, { list: ["A", "C", "B"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B", "C", "A"] }, { list: ["C", "A", "B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["C", "A", "B"] });
        }
      )
    );

    test(
      "remote move conflicts with move via undo",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B", "C"]),
        },
        async ({ root1, root2, room2, socketUtils, assert }) => {
          root1.get("list").move(0, 2);
          root2.get("list").move(1, 2);
          root2.get("list").move(2, 1);
          room2.history.undo();

          assert({ list: ["B", "C", "A"] }, { list: ["A", "C", "B"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B", "C", "A"] }, { list: ["C", "A", "B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["C", "A", "B"] });
        }
      )
    );

    test(
      "remote move conflicts with set",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").move(0, 1);
          root2.get("list").push("C");
          root2.get("list").set(2, "D");

          assert({ list: ["B", "A"] }, { list: ["A", "B", "D"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B", "A"] }, { list: ["B", "A", "D"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["B", "D"] });
        }
      )
    );

    test.skip(
      "remote move conflicts with set via undo",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B"]),
        },
        async ({ root1, root2, room2, socketUtils, assert }) => {
          root1.get("list").move(0, 1);
          root2.get("list").push("C");
          root2.get("list").set(2, "D");
          root2.get("list").set(2, "E");
          room2.history.undo();

          assert({ list: ["B", "A"] }, { list: ["A", "B", "D"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B", "A"] }, { list: ["B", "A", "D"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["B", "D"] });
        }
      )
    );

    test(
      "remote move conflicts with delete",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").move(0, 1);
          root2.get("list").delete(0);

          assert({ list: ["B", "A"] }, { list: ["B"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B", "A"] }, { list: ["B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["B"] });
        }
      )
    );

    test(
      "remote move conflicts with insert",
      prepareTestsConflicts(
        {
          list: new LiveList(["A", "B"]),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").move(0, 1);
          root2.get("list").push("C");

          assert({ list: ["B", "A"] }, { list: ["A", "B", "C"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B", "A"] }, { list: ["B", "A", "C"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["B", "A", "C"] });
        }
      )
    );
  });

  describe("other combinations", () => {
    test(
      "push + set / push + set",
      prepareTestsConflicts(
        {
          list: new LiveList<string>(),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").push("A");
          root1.get("list").set(0, "B");

          root2.get("list").push("C");
          root2.get("list").set(0, "D");

          assert({ list: ["B"] }, { list: ["D"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B"] }, { list: ["B", "D"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["D"] });
        }
      )
    );

    test(
      "set / insert + set",
      prepareTestsConflicts(
        {
          list: new LiveList<string>(),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").set(0, "B");
          root2.get("list").insert("C", 0);
          root2.get("list").set(0, "D");

          assert({ list: ["B"] }, { list: ["D", "A"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["B"] }, { list: ["D", "B"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["D", "B"] });
        }
      )
    );

    test(
      "delete + push / set",
      prepareTestsConflicts(
        {
          list: new LiveList<string>(),
        },
        async ({ root1, root2, socketUtils, assert }) => {
          root1.get("list").delete(1);
          root1.get("list").push("C");
          root2.get("list").set(1, "D");

          assert({ list: ["A", "C"] }, { list: ["A", "D"] });

          await socketUtils.sendMessagesClient1();

          assert({ list: ["A", "C"] }, { list: ["A", "C", "D"] });

          await socketUtils.sendMessagesClient2();

          assert({ list: ["A", "D"] });
        }
      )
    );
  });
});
