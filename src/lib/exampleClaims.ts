export const EXAMPLE_CLAIMS = `1. An apparatus to treat tissue of a prostate of a patient, the apparatus comprising:
a display;
a processor operatively coupled to the display; and
a memory comprising instructions that when executed by the processor, cause the apparatus to:
receive an image of a prostate,
identify delicate tissue structures of the prostate based on the image, the delicate tissue structures comprising at least one of bladder or sphincter,
identify one or more components of the apparatus, the one or more components comprising a surgical instrument and an energy source,
generate, using a trained classifier, a treatment plan to resect or remove a tissue.

2. The apparatus of claim 1, wherein the instructions further cause the apparatus to determine a location of the delicate tissue structure in relation to the tissue removal profile and to display a value of the one or more of a safety parameter or an efficacy parameter.

3. The apparatus of claim 1, wherein the delicate tissue structure comprises a verumontanum of the prostate.

4. The apparatus of any one of claims 1 to 3, wherein the delicate tissue structure comprises cancerous tissue.

5. The apparatus of any one of claims 1 to 4, wherein the tissue removal profile comprises one or more protection zones determined based, at least in part, upon one or more of decreasing damage to the delicate tissue structure or avoiding disbursement of pathogenic tissue.

6. The apparatus of claim 1, wherein the trained classifier is a trained neural network.

7. The apparatus of claim 1, wherein the trained classifier is a trained artificial intelligence network.

8. The apparatus of claim 1, wherein the instructions cause the apparatus to identify, using the trained classifier, the delicate tissue structures of the prostate within the image.

9. The apparatus of claim 1, wherein the tissue removal profile includes a cut profile.

10. The apparatus of claim 9, wherein the cut profile includes a plurality of locations comprising a plurality of angular coordinates about a treatment axis, a plurality of corresponding axial coordinates along the axis, and a plurality of radial distances from the axis.

11. The apparatus of claim 10, wherein the instructions further cause the apparatus to adjust the cut profile based on a user input.

12. The apparatus of claim 11, wherein the instructions cause the apparatus to adjust at least one of:
the plurality of angular coordinates about the treatment axis,
the plurality of corresponding axial coordinates along the axis, or
the plurality of radial distances from the axis.

13. The apparatus of claim 1, wherein the instructions cause the apparatus to identify the delicate tissue structures of the prostate with a trained convolutional neural network.

14. The apparatus of claim 1, wherein the instructions cause the apparatus to identify the delicate tissue structures of the prostate using edge detection, feature recognition, or segmentation.

15. The apparatus of claim 2, wherein the safety parameter and the efficacy parameter are generated with a classifier.

16. The apparatus of claim 1, wherein the instructions cause the apparatus to display the image of the prostate with the tissue removal profile in one or more of a sagittal view, parasagittal view, a transverse view, a coronal view, a paracoronal view, or a three-dimensional view.

17. The apparatus of claim 1, wherein the image of the prostate comprises one or more of tissue margin identification, tissue plane identification, tissue differentiation detection, fluoroscopy, CT scan imaging, magnetic resonance imaging, radioactivity detection, or radiopaque imaging.

18. The apparatus of claim 5, wherein the prostate comprises a delicate tissue structure and the tissue removal profile comprises a protection zone, and the protection zone of the tissue removal profile is determined in response to the image of the prostate and the one or more of the safety parameter or the efficacy parameter.

19. The apparatus of claim 18, wherein the protection zone is one of a plurality of protection zones, and the plurality of protection zones of the tissue removal profile are determined, at least in response, to the image of the prostate and the one or more of the safety parameter or the efficacy parameter.

20. The apparatus of claim 19, wherein one or more of the plurality of protection zones are determined, at least in part, based on one or more of avoiding damage to delicate tissue structures or avoiding disbursement of pathogenic tissue.

21. The apparatus of claim 12, wherein the user input comprises a selection of a region of interest within the image of the prostate, and the apparatus adjusts the plurality of radial distances to avoid the region of interest.

22. The apparatus of claim 21, wherein the region of interest comprises a suspected tumor location, and the instructions cause the apparatus to modify the cut profile to encompass the suspected tumor location while maintaining a minimum safety margin from the delicate tissue structures.`;
